"""Economic context agent — commodity prices + market indicators.

Adds WHY context to the briefing: when shipping costs spike, when manufacturing
contracts, when commodity prices move — these explain supply chain tech trends.

Uses yfinance (free, no API key). FRED integration available if FRED_API_KEY is set.
"""

import logging
import uuid
from datetime import datetime, timezone

import numpy as np

from pipeline.utils.db import get_db

logger = logging.getLogger("pipeline.economic")

# Supply-chain-relevant tickers
COMMODITIES = {
    "CL=F": {"name": "Crude Oil", "category": "energy", "impact": "shipping/transport costs"},
    "HG=F": {"name": "Copper", "category": "materials", "impact": "electronics/manufacturing input"},
    "NG=F": {"name": "Natural Gas", "category": "energy", "impact": "factory energy costs"},
}

SUPPLY_CHAIN_ETFS = {
    "BOTZ": {"name": "Robotics & AI ETF", "category": "tech_adoption", "impact": "robotics investment trend"},
    "BDRY": {"name": "Baltic Dry Index ETF", "category": "shipping", "impact": "global shipping demand"},
    "XLI": {"name": "Industrials ETF", "category": "manufacturing", "impact": "industrial sector health"},
    "IYT": {"name": "Transportation ETF", "category": "logistics", "impact": "logistics sector health"},
}


class EconomicAgent:
    name = "economic"

    async def run(self) -> dict:
        import yfinance as yf

        db = get_db()
        signals_created = 0
        all_tickers = {**COMMODITIES, **SUPPLY_CHAIN_ETFS}

        for ticker, meta in all_tickers.items():
            try:
                data = yf.download(ticker, period="90d", interval="1d", progress=False)
                if data.empty or len(data) < 10:
                    logger.warning(f"[{ticker}] No data")
                    continue

                close = data["Close"].dropna()
                if hasattr(close, 'values') and close.ndim > 1:
                    close = close.iloc[:, 0]

                current = float(close.iloc[-1])
                ma_7 = float(close.tail(7).mean())
                ma_30 = float(close.tail(30).mean())
                ma_90 = float(close.mean())
                std_90 = float(close.std())

                pct_7d = ((current - ma_7) / ma_7) * 100 if ma_7 else 0
                pct_30d = ((current - ma_30) / ma_30) * 100 if ma_30 else 0

                # Anomaly: price > 2 std devs from 90-day mean
                is_anomaly = abs(current - ma_90) > (2 * std_90) if std_90 > 0 else False

                # Direction
                if pct_7d > 3:
                    direction = "surging"
                elif pct_7d > 1:
                    direction = "rising"
                elif pct_7d < -3:
                    direction = "dropping"
                elif pct_7d < -1:
                    direction = "declining"
                else:
                    direction = "stable"

                # Only create a signal if something interesting is happening
                if abs(pct_7d) > 2 or is_anomaly:
                    title = f"{meta['name']} {direction} ({pct_7d:+.1f}% 7d) — {meta['impact']}"
                    signal = {
                        "id": str(uuid.uuid4()),
                        "title": title,
                        "url": f"https://finance.yahoo.com/quote/{ticker}",
                        "source": "yfinance",
                        "source_domain": "finance.yahoo.com",
                        "signal_type": "market_shift",
                        "industry": meta["category"],
                        "confidence": 0.8,
                        "importance_score": min(abs(pct_7d) / 10, 1.0),
                        "relevance_score": min(abs(pct_7d) / 10, 1.0),
                        "is_noise": False,
                        "amount_usd": current,
                        "discovered_at": datetime.now(timezone.utc).isoformat(),
                        "evidence": [{
                            "text": (
                                f"{meta['name']} ({ticker}): ${current:.2f}. "
                                f"7d: {pct_7d:+.1f}%, 30d: {pct_30d:+.1f}%. "
                                f"90d avg: ${ma_90:.2f}, std: ${std_90:.2f}. "
                                f"{'ANOMALY — ' if is_anomaly else ''}"
                                f"Impact: {meta['impact']}."
                            ),
                            "source": "yfinance",
                        }],
                        "tags": [meta["category"], direction],
                        "quality_flags": ["economic_indicator"] + (["anomaly"] if is_anomaly else []),
                    }

                    try:
                        db.insert("intel_signals", signal)
                        signals_created += 1
                        logger.info(f"[{ticker}] {direction} {pct_7d:+.1f}% → signal created")
                    except Exception as e:
                        logger.warning(f"[{ticker}] Insert failed: {e}")
                else:
                    logger.info(f"[{ticker}] {direction} {pct_7d:+.1f}% — no signal (within normal range)")

            except Exception as e:
                logger.warning(f"[{ticker}] Failed: {e}")

        logger.info(f"Economic: {signals_created} signals created from {len(all_tickers)} tickers")
        return {"signals_created": signals_created, "tickers_checked": len(all_tickers)}
