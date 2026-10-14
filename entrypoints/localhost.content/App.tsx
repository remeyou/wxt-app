import { storage, useEffect } from "#imports";
import { download, inquiryElements, scaleLarge } from "@/utils/dom";
import { $ } from "jquery";
import { useState } from "react";

const defaultSettings = {
  clickToDownload: false,
  rightClickToZoom: false,
};

const localhostSettings = storage.defineItem("local:localhostSettings", {
  fallback: defaultSettings,
});

function App() {
  const [hover, setHover] = useState(false);
  const [displaySettings, setDisplaySettings] = useState(defaultSettings);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const settings = await localhostSettings.getValue();
    setDisplaySettings(settings);
    const $els = await inquiryElements(".ant-card");
    $els.each((i, el) => {
      const $el = $(el);
      $el.off("click");
      if (settings.clickToDownload) {
        $el.on("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          download(
            $el.find("img").attr("src"),
            $el.find(".ant-card-meta-title").text(),
          );
        });
      }
      const $img = $el.find("img");
      $img.off("contextmenu");
      if (settings.rightClickToZoom) {
        let initialStyle: JQuery.PlainObject<string> | undefined = undefined;
        $img.on("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (initialStyle) {
            $img.css(initialStyle);
            initialStyle = undefined;
          } else {
            initialStyle = $img.css([
              "position",
              "z-index",
              "transform",
              "box-shadow",
            ]);
            scaleLarge($img);
          }
        });
      }
    });
  }

  async function onSettingsChange(
    name: string,
    checked: boolean,
  ): Promise<void> {
    await localhostSettings.setValue({ ...displaySettings, [name]: checked });
    init();
  }

  return (
    <div
      id="wxt-root"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {hover ? (
        <div className="settings">
          <div>
            <input
              type="checkbox"
              id="clickToDownload"
              checked={displaySettings.clickToDownload}
              onChange={(e) =>
                onSettingsChange("clickToDownload", e.target.checked)
              }
            />
            <label htmlFor="clickToDownload">Click to download</label>
          </div>
          <div>
            <input
              type="checkbox"
              id="rightClickToZoom"
              checked={displaySettings.rightClickToZoom}
              onChange={(e) =>
                onSettingsChange("rightClickToZoom", e.target.checked)
              }
            />
            <label htmlFor="rightClickToZoom">Right click to zoom</label>
          </div>
        </div>
      ) : (
        <div>🛠️</div>
      )}
    </div>
  );
}

export default App;
