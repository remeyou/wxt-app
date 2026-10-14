import saveAs from "file-saver";
import { $ } from "jquery";
import { Status } from "./constants";

export const inquiryElements = (
  elementSelector: string,
): Promise<JQuery<HTMLElement>> => {
  const els = $(elementSelector);
  if (!els?.length) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(inquiryElements(elementSelector));
      }, 2000);
    });
  } else {
    return Promise.resolve(els);
  }
};

export const scaleLarge = ($el: JQuery<HTMLElement>) => {
  const el = $el[0];
  if (!el) {
    console.error("Element error: ", el, $el);
    return;
  }
  const { width, height, top, left, right, bottom } =
    el.getBoundingClientRect();
  const ratio = document.documentElement.clientHeight / height;
  const scaledTopOffset = (height / 2) * (ratio - 1) - top;
  let scaledXOffset = 0;
  const scaledWidthDiff = (width / 2) * (ratio - 1);
  if (scaledWidthDiff > left) {
    scaledXOffset = scaledWidthDiff - left;
  } else if (
    scaledWidthDiff - (document.documentElement.clientWidth - right) >
    0
  ) {
    scaledXOffset =
      document.documentElement.clientWidth - right - scaledWidthDiff;
  }
  $el.css({
    position: "relative",
    transform: `translate(${scaledXOffset}px, ${scaledTopOffset}px) scale(${ratio})`,
    "z-index": 10000,
    "box-shadow": `0 0 0 ${Math.max(top, right, bottom, left)}px rgba(0,0,0,0.5)`,
  });
};

export const download = async (url?: string, filename?: string) => {
  try {
    if (!url) {
      throw new Error("Cannot get url.");
    }
    const resp = await fetch(url);
    const blob = await resp.blob();
    saveAs(blob, filename);
    return Status.Done;
  } catch (r) {
    console.error(
      `download() failed: Params: ${url}, ${filename}. Error: ${r}`,
    );
    return Status.Error;
  }
};
