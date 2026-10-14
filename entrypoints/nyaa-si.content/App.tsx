import { Status } from "@/utils/constants";
import { saveAs } from "file-saver";
import { useEffect, useState } from "react";
import "./App.css";

type TorrentList = {
  title: string;
  torrentLink: string;
  magnetLink: string;
  status: Status;
}[];

function App() {
  const [hover, setHover] = useState(false);
  const [list, setList] = useState<TorrentList>([]);
  const [copy, setCopy] = useState(false);

  useEffect(() => {
    const result: TorrentList = [];
    document.querySelectorAll("tr[class]").forEach((el) => {
      result.push({
        title: el.querySelector("a[href*='view']")?.textContent ?? "",
        torrentLink:
          el.querySelector("a[href$='torrent']")?.getAttribute("href") ?? "",
        magnetLink:
          el.querySelector("a[href^='magnet']")?.getAttribute("href") ?? "",
        status: Status.Init,
      });
    });
    setList(result);
  }, []);

  const torrents = list.filter(({ torrentLink }) => torrentLink);
  async function downloadAllTorrents() {
    for await (const [idx, { torrentLink, title }] of torrents.entries()) {
      let status: Status;
      try {
        saveAs(
          await (await fetch(location.origin + torrentLink)).blob(),
          title + ".torrent",
        );
        status = Status.Done;
      } catch (error) {
        console.error("Download error", error);
        status = Status.Error;
      } finally {
        setList((prev) =>
          prev.map((v, i) => (i == idx ? { ...v, status } : v)),
        );
      }
    }
  }

  const onlyMagnetLinks = list.filter(
    ({ torrentLink, magnetLink }) => !torrentLink && magnetLink,
  );
  function copyAllOnlyMagnetLinks() {
    navigator.clipboard
      .writeText(
        onlyMagnetLinks
          .map(({ title, magnetLink }) => title + "\n" + magnetLink + "\n")
          .join(""),
      )
      .then(() => setCopy(true))
      .catch(console.error);
  }

  return (
    <div
      id="wxt-root"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {hover ? (
        <div>
          {torrents.some(({ status }) => status !== Status.Init) ? (
            <ol>
              {torrents.map(({ title, status }) => (
                <li key={title}>
                  {title}...{status === Status.Done && <span>✅</span>}
                  {status === Status.Error && <span>❌</span>}
                </li>
              ))}
            </ol>
          ) : (
            <a onClick={downloadAllTorrents}>Download all torrents</a>
          )}
          {Boolean(onlyMagnetLinks.length) && (
            <div>
              {copy ? (
                <span>{onlyMagnetLinks.length} magnet link(s) copied.</span>
              ) : (
                <a onClick={copyAllOnlyMagnetLinks}>
                  Copy all only magnet links
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>🛠️</div>
      )}
    </div>
  );
}

export default App;
