import { browser, storage, useEffect } from "#imports";
import { RequestType, Status } from "@/utils/constants";
import { inquiryElements, scaleLarge } from "@/utils/dom";
import type { DownloadRequest, WxtResponse } from "@/utils/typings";
import { $ } from "jquery";
import { useState } from "react";

const enum FormNames {
  ClickSelect = "ClickSelect",
  RightClickSelect = "RightClickSelect",
  ShowAllBlacklists = "ShowAllBlacklists",
  ShowTools = "ShowTools",
}

const ClickOptions = {
  Default: "Default",
  CopyId: "Copy ID",
  Download: "Download",
  Zoom: "Zoom",
} as const;
type ClickOptions = (typeof ClickOptions)[keyof typeof ClickOptions];

const defaultSettings = {
  [FormNames.ClickSelect]: ClickOptions.Default as ClickOptions,
  [FormNames.RightClickSelect]: ClickOptions.Default as ClickOptions,
  [FormNames.ShowAllBlacklists]: false,
  [FormNames.ShowTools]: false,
};

const yandereSettings = storage.defineItem("local:yandereSettings", {
  fallback: defaultSettings,
});

async function downloadPost($el: JQuery<HTMLElement>) {
  const href = $el.find("a.directlink.largeimg").attr("href");
  const tmp = href
    ?.replace(/(\/jpeg\/)|(\/sample\/)/, "/image/")
    .replace("%20sample%20", "%20");
  const url = tmp !== href ? tmp?.replace(".jpg", ".png") : href;
  const filename =
    $el.find("a.thumb").attr("href")?.replaceAll("/", "_") +
    (href === url ? ".jpg" : ".png");
  const resp = await browser.runtime.sendMessage<DownloadRequest, WxtResponse>({
    type: RequestType.Download,
    data: {
      url,
      filename,
    },
  });
  return { filename, status: resp.status };
}

function App() {
  const [hover, setHover] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [posts, setPosts] = useState<{
    list?: JQuery<HTMLElement>;
    status: Status;
    success: number;
    failedList: string[];
  }>({ status: Status.Init, success: 0, failedList: [] });

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const values = await yandereSettings.getValue();
    setSettings(values);
    const $els = await inquiryElements("#post-list-posts > li");
    setPosts({ ...posts, list: $els });
    // avoid transform img corp
    $("ul#post-list-posts .inner").css({ overflow: "visible" });
    $els.each((i, el) => {
      const $el = $(el);
      const $img = $el.find("img.preview");
      $el.css({
        position: "relative",
      });
      const $status = $("<div></div>")
        .addClass("wxt-status")
        .css({ position: "absolute", bottom: 0, right: 0 })
        .appendTo($el);
      async function copyId() {
        $status.text("⏳");
        await navigator.clipboard.writeText(
          ($el.attr("id") ?? "").replaceAll("p", ""),
        );
        $status.text("✅");
      }
      let initialStyle: JQuery.PlainObject<string> | undefined = undefined;
      const onClickOrContextMenu = async (
        e: JQuery.MouseEventBase<
          HTMLElement,
          undefined,
          HTMLElement,
          HTMLElement
        >,
      ): Promise<void> => {
        e.preventDefault();
        e.stopPropagation();
        const eventType =
          (e.type === "click" && values[FormNames.ClickSelect]) ||
          (e.type === "contextmenu" && values[FormNames.RightClickSelect]) ||
          ClickOptions.Default;
        if (eventType === ClickOptions.CopyId) {
          copyId();
        }
        if (eventType === ClickOptions.Download) {
          $status.text("⏳");
          if ((await downloadPost($el)).status === Status.Done) {
            $status.text("✅");
          } else {
            $status.text("❌");
          }
        }
        if (eventType === ClickOptions.Zoom) {
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
        }
      };
      $img.off("click");
      if (values[FormNames.ClickSelect] !== ClickOptions.Default) {
        $img.on("click", onClickOrContextMenu);
      }
      $img.off("contextmenu");
      if (values[FormNames.RightClickSelect] !== ClickOptions.Default) {
        $img.on("contextmenu", onClickOrContextMenu);
      }
      if (values[FormNames.ShowAllBlacklists] && $el.is(".javascript-hide")) {
        $el.removeClass("javascript-hide");
      }
      $el.off("mouseenter").off("mouseleave");
      if (values[FormNames.ShowTools]) {
        const $copyId = $("<div>📋</div>")
          .addClass("wxt-tool")
          .css({
            display: "none",
            position: "absolute",
            bottom: 0,
            left: 0,
          })
          .on("click", copyId)
          .appendTo($el);
        $el
          .on("mouseenter", () => {
            $copyId.css({ display: "block" });
          })
          .on("mouseleave", () => {
            $copyId.css({ display: "none" });
          });
      }
    });
  }

  const onSettingsChange = async (
    e: import("react").ChangeEvent<HTMLFormElement, Element>,
  ): Promise<void> => {
    const values: Partial<typeof defaultSettings> = {};
    const formName = e.target.name;
    if (
      formName === FormNames.ClickSelect ||
      formName === FormNames.RightClickSelect
    ) {
      values[formName] = e.target.value;
    }
    if (
      formName === FormNames.ShowAllBlacklists ||
      formName === FormNames.ShowTools
    ) {
      values[formName] = e.target.checked;
    }
    await yandereSettings.setValue({ ...settings, ...values });
    init();
  };

  const downloadAll = async (
    e: import("react").MouseEvent<HTMLButtonElement, MouseEvent>,
  ): Promise<void> => {
    e.preventDefault();
    setPosts({ ...posts, status: Status.Wait, success: 0, failedList: [] });
    for await (const post of Array.from(posts.list ?? [])) {
      const { filename, status: postStatus } = await downloadPost($(post));
      setPosts((prev) => ({
        ...prev,
        success: postStatus === Status.Done ? prev.success + 1 : prev.success,
        failedList:
          postStatus === Status.Error
            ? [...prev.failedList, filename]
            : prev.failedList,
      }));
    }
    setPosts((prev) => ({ ...prev, status: Status.Done }));
  };

  return (
    <div
      id="wxt-root"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {hover ? (
        <div>
          <form onChange={onSettingsChange}>
            <div>
              <span>Click to: </span>
              <select
                name={FormNames.ClickSelect}
                defaultValue={settings[FormNames.ClickSelect]}
              >
                {Object.values(ClickOptions).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span>Right click to: </span>
              <select
                name={FormNames.RightClickSelect}
                defaultValue={settings[FormNames.RightClickSelect]}
              >
                {Object.values(ClickOptions).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="checkbox"
                id={FormNames.ShowAllBlacklists}
                name={FormNames.ShowAllBlacklists}
                defaultChecked={settings[FormNames.ShowAllBlacklists]}
              />
              <label htmlFor={FormNames.ShowAllBlacklists}>
                Show all blacklists
              </label>
            </div>
            <div>
              <input
                type="checkbox"
                id={FormNames.ShowTools}
                name={FormNames.ShowTools}
                defaultChecked={settings[FormNames.ShowTools]}
              />
              <label htmlFor={FormNames.ShowTools}>Show tools</label>
            </div>
          </form>
          <div>
            <button onClick={downloadAll}>
              Download all{" "}
              {posts.status !== Status.Init &&
                `(${posts.success}/${posts.list?.length})`}
            </button>
            {Boolean(posts.failedList.length) && <div>Download failed:</div>}
            {posts.failedList.map((str) => (
              <div key={str}>{str}</div>
            ))}
          </div>
        </div>
      ) : (
        <div>🛠️</div>
      )}
    </div>
  );
}

export default App;
