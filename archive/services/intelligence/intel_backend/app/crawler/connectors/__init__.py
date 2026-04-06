from app.crawler.connectors.api import APIConnector
from app.crawler.connectors.base import ConnectorResult
from app.crawler.connectors.html import HTMLConnector
from app.crawler.connectors.rss import RSSConnector
from app.crawler.connectors.search_page import SearchPageConnector
from app.crawler.connectors.sitemap import SitemapConnector

CONNECTOR_REGISTRY = {
    "rss": RSSConnector,
    "sitemap": SitemapConnector,
    "html": HTMLConnector,
    "api": APIConnector,
    "search-page": SearchPageConnector,
}

__all__ = ["ConnectorResult", "CONNECTOR_REGISTRY"]

