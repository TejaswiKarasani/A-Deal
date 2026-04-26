from app.models import Run, User


def test_admin_can_create_list_update_runs_and_user_model(client, db_session, auth_headers):
    create_response = client.post(
        "/admin/runs",
        json={
            "name": "Run A",
            "model_assignment": "all_opus",
            "is_real": True,
            "is_public": False,
        },
        headers=auth_headers,
    )

    assert create_response.status_code == 200
    created = create_response.json()
    assert created["name"] == "Run A"
    assert created["status"] == "pending"
    assert created["is_public"] is False

    list_response = client.get("/admin/runs", headers=auth_headers)
    assert list_response.status_code == 200
    assert [run["id"] for run in list_response.json()] == [created["id"]]

    update_response = client.patch(
        f"/admin/runs/{created['id']}", json={"status": "active"}, headers=auth_headers
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "active"
    assert db_session.get(Run, created["id"]).status == "active"

    user = db_session.query(User).first()
    users_response = client.get("/admin/users", headers=auth_headers)
    assert users_response.status_code == 200
    assert users_response.json()[0]["onboarding_complete"] is True

    model = "deepseek-ai/deepseek-r1-0528"
    user_update = client.patch(
        f"/admin/users/{user.id}", json={"agent_model": model}, headers=auth_headers
    )
    assert user_update.status_code == 200
    assert user_update.json()["agent_model"] == model
    assert db_session.get(User, user.id).agent_model == model


def test_survey_submit_retrieve_duplicate_and_aggregate(client, db_session, auth_headers):
    run = Run(name="Closed Run", status="closed", is_public=True, model_assignment="all_opus")
    other_user = User(
        name="Other User",
        email="other@example.com",
        hashed_password="irrelevant",
        onboarding_complete=0,
    )
    db_session.add_all([run, other_user])
    db_session.commit()
    db_session.refresh(run)

    payload = {
        "overall_satisfaction": 6,
        "fairness_scores": {"deal_id_1": 4, "deal_id_2": 5},
        "preferred_run_rank": [1, 3, 2, 4],
        "willing_to_pay": True,
        "wtp_amount": 9.99,
    }
    submit = client.post(f"/survey/runs/{run.id}/submit", json=payload, headers=auth_headers)
    assert submit.status_code == 200
    assert submit.json()["overall_satisfaction"] == 6
    assert submit.json()["fairness_scores"] == payload["fairness_scores"]

    duplicate = client.post(f"/survey/runs/{run.id}/submit", json=payload, headers=auth_headers)
    assert duplicate.status_code == 400

    mine = client.get(f"/survey/runs/{run.id}/my", headers=auth_headers)
    assert mine.status_code == 200
    assert mine.json()["preferred_run_rank"] == [1, 3, 2, 4]

    aggregate = client.get(f"/admin/survey/runs/{run.id}", headers=auth_headers)
    assert aggregate.status_code == 200
    data = aggregate.json()
    assert data["response_count"] == 1
    assert data["mean_satisfaction"] == 6
    assert data["mean_fairness"] == 4.5
    assert data["wtp_percentage"] == 100
