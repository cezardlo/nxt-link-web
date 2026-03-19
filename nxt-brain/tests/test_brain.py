import pytest
from brain import Brain

def test_brain_audit():
    result = Brain().audit()
    assert result is not None

def test_brain_score():
    N = 10
    result = Brain().score(N)
    assert isinstance(result, list)
    assert len(result) == N

def test_brain_feed():
    N = 5
    result = Brain().feed(N)
    assert isinstance(result, list)
    assert len(result) == N

def test_brain_trends():
    industry = "technology"
    result = Brain().trends(industry)
    assert isinstance(result, dict)
    assert "forecast" in result

def test_brain_drill():
    signal_title = "AI advancements"
    result = Brain().drill(signal_title)
    assert isinstance(result, dict)
    assert "details" in result

def test_brain_connect():
    result = Brain().connect("defense", "ai-ml")
    assert isinstance(result, list)

def test_brain_supply():
    result = Brain().supply("defense")
    assert isinstance(result, dict)

def test_brain_decide():
    question = "What should we focus on next?"
    result = Brain().decide(question)
    assert isinstance(result, str)

def test_brain_entities():
    industry = "healthcare"
    result = Brain().entities(industry)
    assert isinstance(result, list)

def test_brain_patents():
    query = "machine learning"
    result = Brain().patents(query)
    assert isinstance(result, list)