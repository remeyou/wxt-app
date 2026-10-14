import type { Browser } from "#imports";
import { browser, defineBackground } from "#imports";
import { RequestType, Status } from "@/utils/constants";
import type { DownloadRequest, WxtResponse } from "@/utils/typings";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (
      request: DownloadRequest,
      sender,
      sendResponse: (response: WxtResponse) => void,
    ) => {
      if (request.type === RequestType.Download) {
        const { url, filename } = request.data ?? {};
        if (!url) {
          console.error("url param error: ", url);
          sendResponse({ status: Status.Error });
        } else {
          browser.downloads.download(
            {
              url,
              filename,
            },
            (downloadId) => {
              if (browser.runtime.lastError) {
                console.error(
                  "browser.runtime.lastError error: ",
                  browser.runtime.lastError,
                );
                sendResponse({ status: Status.Error });
                return;
              }
              const onChange = (delta: Browser.downloads.DownloadDelta) => {
                if (delta.state?.current === "complete") {
                  browser.downloads.onChanged.removeListener(onChange);
                  sendResponse({ status: Status.Done });
                } else if (delta.error?.current) {
                  browser.downloads.onChanged.removeListener(onChange);
                  console.error("browser.downloads.onChanged error: ", delta);
                  sendResponse({ status: Status.Error });
                }
              };
              browser.downloads.onChanged.addListener(onChange);
            },
          );
        }
      }
      return true;
    },
  );
});
