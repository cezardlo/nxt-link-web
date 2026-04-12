"""Playwright browser rendering for JS-heavy conference sites."""

import asyncio
from typing import Optional
from loguru import logger

_playwright = None
_browser = None


async def get_browser():
    global _playwright, _browser
    if _browser and _browser.is_connected():
        return _browser

    from playwright.async_api import async_playwright
    _playwright = await async_playwright().start()
    _browser = await _playwright.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    )
    logger.info("Playwright browser launched")
    return _browser


async def render_page(
    url: str,
    wait_for: str = "networkidle",
    timeout: int = 20000,
    scroll: bool = True,
    click_load_more: bool = True,
) -> Optional[str]:
    """Render a JS-heavy page and return full HTML."""
    try:
        browser = await get_browser()
        if not browser.is_connected():
            global _browser
            _browser = None
            browser = await get_browser()

        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
        )
        page = await context.new_page()

        # Block heavy resources for speed
        await page.route("**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,mp4,webm,ico}", lambda route: route.abort())

        await page.goto(url, wait_until=wait_for, timeout=timeout)

        if scroll:
            for i in range(5):
                await page.evaluate(f"window.scrollTo(0, {(i + 1) * 1000})")
                await asyncio.sleep(0.5)

        if click_load_more:
            for selector in [
                "button:has-text('Load More')", "button:has-text('Show All')",
                "a:has-text('View All')", "[class*='load-more']", "[class*='show-all']",
            ]:
                try:
                    btn = page.locator(selector).first
                    if await btn.is_visible(timeout=1000):
                        await btn.click()
                        await asyncio.sleep(2)
                        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                        await asyncio.sleep(1)
                        break
                except Exception:
                    continue

        html = await page.content()
        await context.close()
        return html
    except Exception as e:
        logger.warning(f"Browser render failed for {url}: {e}")
        return None


async def close_browser():
    global _playwright, _browser
    if _browser:
        await _browser.close()
        _browser = None
    if _playwright:
        await _playwright.stop()
        _playwright = None
