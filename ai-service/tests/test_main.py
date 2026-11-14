"""Tests for the AI service. The Anthropic client is MOCKED here: these verify our request/response handling,
not the live provider. The live check is the admin dashboard's "Test connection" button."""
import json
import os
from types import SimpleNamespace

os.environ["AI_SERVICE_TOKEN"] = "test-token"
os.environ["ANTHROPIC_API_KEY"] = "test-key-not-real"

from fastapi.testclient import TestClient  # noqa: E402

from app import main  # noqa: E402

http = TestClient(main.app)
AUTH = {"X-Service-Token": "test-token"}
ANALYZE = {"title": "Blog", "description": "A blog app", "categories": ["Web Development"], "technologies": ["Java", "Spring Boot"]}


class FakeClient:
    """Stands in for anthropic.Anthropic and records the request it was given."""

    def __init__(self, result, stop_reason="end_turn"):
        self.result, self.stop_reason, self.request = result, stop_reason, None
        self.messages = self

    def create(self, **kwargs):
        self.request = kwargs
        text = self.result if isinstance(self.result, str) else json.dumps(self.result)
        return SimpleNamespace(stop_reason=self.stop_reason, model="mock-model", content=[SimpleNamespace(type="text", text=text)],
                               usage=SimpleNamespace(input_tokens=120, output_tokens=40))


def analysis(**over):
    base = {"short_description": "A blog.", "overview": None, "problem_statement": None, "objectives": [], "features": ["Posts"], "modules": [],
            "technologies": ["Spring Boot", "Rust"], "category": "Web Development", "project_type": "SOFTWARE_PROJECT", "difficulty": "BEGINNER",
            "documentation_quality": 14, "completeness": None, "student_relevance": 7, "evidence_notes": "From README."}
    return {**base, **over}


def test_health_reports_configuration_without_secrets():
    body = http.get("/health").json()
    assert body["configured"] is True and body["model"]
    assert "test-key" not in json.dumps(body)


def test_endpoints_require_the_service_token():
    assert http.post("/v1/analyze-project", json=ANALYZE).status_code == 401
    assert http.post("/v1/draft-message", json={}, headers={"X-Service-Token": "wrong"}).status_code == 401


def test_analysis_enforces_allow_lists_and_rating_bounds(monkeypatch):
    fake = FakeClient(analysis())
    monkeypatch.setattr(main, "_client", fake)
    r = http.post("/v1/analyze-project", json=ANALYZE, headers=AUTH)
    assert r.status_code == 200
    result = r.json()["result"]
    assert result["technologies"] == ["Spring Boot"]          # "Rust" is not in the allowed list
    assert result["documentation_quality"] == 10              # clamped to 0-10
    assert result["completeness"] is None                     # unknown stays unknown
    assert r.json()["usage"] == {"input_tokens": 120, "output_tokens": 40}
    assert fake.request["output_config"]["format"]["type"] == "json_schema"
    assert "thinking" not in fake.request and "temperature" not in fake.request


def test_unknown_category_becomes_null(monkeypatch):
    monkeypatch.setattr(main, "_client", FakeClient(analysis(category="Quantum Computing")))
    assert http.post("/v1/analyze-project", json=ANALYZE, headers=AUTH).json()["result"]["category"] is None


def test_refusal_is_reported_not_parsed(monkeypatch):
    monkeypatch.setattr(main, "_client", FakeClient("", stop_reason="refusal"))
    assert http.post("/v1/analyze-project", json=ANALYZE, headers=AUTH).status_code == 422


def test_draft_validates_channel(monkeypatch):
    monkeypatch.setattr(main, "_client", FakeClient({"subject": "Hi", "body": "Hello Asha"}))
    ok = {"student_first_name": "Asha", "channel": "EMAIL", "observed_behaviour": "Saved 2 Java projects", "site_name": "ProjectShelf"}
    assert http.post("/v1/draft-message", json=ok, headers=AUTH).json()["result"]["body"] == "Hello Asha"
    assert http.post("/v1/draft-message", json={**ok, "channel": "SMS"}, headers=AUTH).status_code == 422


def test_academic_asset_generation_endpoints():
    payload = {
        "title": "Hospital Management System",
        "overview": "A full stack web app for patient records.",
        "technologies": ["Java", "Spring Boot", "MySQL"],
        "features": ["Patient Registration", "Billing"],
        "modules": ["Auth", "Appointments", "Billing"],
        "student_name": "Arjun Verma",
        "college_name": "Delhi Technological University"
    }
    # Test Report generation (.docx)
    r_rep = http.post("/v1/generate/report", json=payload, headers=AUTH)
    assert r_rep.status_code == 200
    assert len(r_rep.content) > 1000
    assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in r_rep.headers["content-type"]

    # Test Presentation generation (.pptx)
    r_ppt = http.post("/v1/generate/presentation", json=payload, headers=AUTH)
    assert r_ppt.status_code == 200
    assert len(r_ppt.content) > 1000
    assert "application/vnd.openxmlformats-officedocument.presentationml.presentation" in r_ppt.headers["content-type"]

    # Test Viva Guide generation (.docx)
    r_viva = http.post("/v1/generate/viva", json=payload, headers=AUTH)
    assert r_viva.status_code == 200
    assert len(r_viva.content) > 1000

