"""Run WebKitGTK against the released static files at a Pages-style path.

Requires Ubuntu's webkit2gtk-driver and python3-selenium packages and a display
(real or Xvfb). Each journey owns a disposable loopback origin.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
from threading import Thread

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.webkitgtk.options import Options
from selenium.webdriver.webkitgtk.service import Service


ROOT = Path(__file__).resolve().parents[1]


def check_desk(driver, width, address):
    # A plain same-origin frame gives MiniBrowser an exact CSS viewport even
    # when its GTK toolbar has a larger minimum window width.
    driver.get(address)
    driver.switch_to.frame(driver.find_element(By.TAG_NAME, "iframe"))
    wait = WebDriverWait(driver, 15)
    wait.until(lambda browser: browser.execute_script(
        "return document.body?.dataset.homeSurface === 'desk' && document.readyState === 'complete'"
    ))
    size = driver.execute_script("return [innerWidth, document.documentElement.scrollWidth]")
    assert size[0] == width and size[1] <= width, f"Desk overflows {width}px: {size}"
    assert driver.find_element(By.CLASS_NAME, "roost-customize-desk").is_displayed()

    search = driver.find_element(By.ID, "search-input")
    search.send_keys("GitHub")
    wait.until(lambda browser: any(
        title.text == "GitHub" for title in browser.find_elements(By.CSS_SELECTOR, ".roost-command-item strong")
    ))
    search.send_keys(Keys.CONTROL, "a", Keys.NULL, Keys.BACKSPACE, Keys.ESCAPE)
    wait.until(lambda browser: search.get_attribute("value") == "")

    open_note = "#quick-access .roost-card-frame .roost-link-tool"
    # Focus reveals the per-card controls for keyboard users.
    def open_first_note():
        button = driver.find_element(By.CSS_SELECTOR, open_note)
        driver.execute_script("arguments[0].focus()", button)
        button.send_keys(Keys.ENTER)
        return wait.until(lambda browser: browser.find_element(By.ID, "link-note-body"))

    text = f"WebKit saved note at {width}px"
    open_first_note().send_keys(text)
    driver.find_element(By.ID, "link-note-save").click()
    wait.until(lambda browser: browser.find_element(By.ID, "link-note-message").text == "Saved locally")

    def external_resources():
        return driver.execute_script("""
          return performance.getEntriesByType('resource').map(entry => new URL(entry.name, location.href))
            .filter(url => ['http:', 'https:'].includes(url.protocol) && url.origin !== location.origin)
            .map(url => url.origin);
        """)

    assert external_resources() == [], "Desk loaded a third-party resource before consent"
    driver.switch_to.default_content()
    driver.refresh()
    driver.switch_to.frame(driver.find_element(By.TAG_NAME, "iframe"))
    wait.until(lambda browser: browser.find_elements(By.CSS_SELECTOR, open_note))
    assert open_first_note().get_attribute("value") == text, "Saved note missing after reload"
    assert external_resources() == [], "Returning desk loaded a third-party resource before consent"
    print(f"PASS WebKitGTK {width}px: layout, launcher, keyboard note, save, reload and resource origins", flush=True)


def run(width):
    with TemporaryDirectory() as tmp:
        stage = Path(tmp)
        site = stage / "roost"
        site.mkdir()
        for file in ROOT.iterdir():
            if file.is_file() and file.suffix in {".html", ".css", ".js", ".png", ".jpg", ".json"}:
                shutil.copyfile(file, site / file.name)
        (stage / "viewport.html").write_text(
            '<!doctype html><title>WebKit viewport</title><style>body{margin:0}iframe{border:0}</style>'
            f'<iframe width="{width}" height="900" src="/roost/index.html" title="Roost desk"></iframe>',
            encoding="utf-8",
        )
        handler = partial(SimpleHTTPRequestHandler, directory=str(stage))
        with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
            Thread(target=server.serve_forever, daemon=True).start()
            service = Service("/usr/bin/WebKitWebDriver")
            try:
                service.start()
                with webdriver.Remote(command_executor=service.service_url, options=Options()) as driver:
                    print("WebKitGTK", driver.capabilities.get("browserVersion"), flush=True)
                    driver.set_window_size(1480, 1000)
                    check_desk(driver, width, f"http://127.0.0.1:{server.server_port}/viewport.html")
            finally:
                service.stop()
                server.shutdown()


if __name__ == "__main__":
    for viewport in (390, 1280):
        run(viewport)
