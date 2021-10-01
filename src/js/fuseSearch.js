// @ts-check

self.onmessage = (e) => {
  switch (e.data.type) {
    case "init":
      importScripts("../lib/fuse/fuse.min.js");
      self.workerSearchThrothlePeriod = e.data.data.workerSearchThrothlePeriod;
      self.maxResultLength = e.data.data.maxResultLength;
      self.highlightTag = e.data.data.highlightTag;
      self._index = new Fuse(e.data.data.data, e.data.data.options);
      break;

    case "search":
      searchWithTimeout(e.data.data.query);
      break;
  }
};

let timeout = undefined;

const searchWithTimeout = (query) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    postMessage(search(query));
  }, workerSearchThrothlePeriod);
};

const search = (query) => {
  const results = [];
  const rows = self._index.search(query);

  if (rows.length > 0 && !!rows[0].matches) {
    rows.forEach((x) => {
      x.matches.sort((a, b) => a.indices[0][2] - b.indices[0][2]);
    });

    rows.sort((a, b) => {
      const res = a.matches[0].indices[0][2] - b.matches[0].indices[0][2];
      if (res === 0) {
        return a.score - b.score;
      }

      return res;
    });
  }

  for (let i = 0; i < Math.min(rows.length, maxResultLength); i++) {
    let { item, matches } = rows[i];
    let title = item.title;
    let content = item.content;
    let minIndex = content.length;
    matches.forEach(({ indices, key }) => {
      if (key === "content") {
        let offset = 0;
        if (indices[0][0] < minIndex) {
          minIndex = indices[0][0];
        }
        let lastLast = 0;
        for (let i = 0; i < indices.length; i++) {
          if (indices[i][0] < lastLast) {
            if (indices[i][1] > lastLast) {
              lastLast = indices[i][1];
            }
            continue;
          }
          lastLast = indices[i][1];

          let substr = content.substring(
            indices[i][0] + offset,
            indices[i][1] + 1 + offset
          );
          let tag = `<${highlightTag}>` + substr + `</${highlightTag}>`;
          content =
            content.substring(0, indices[i][0] + offset) +
            tag +
            content.substring(indices[i][1] + 1 + offset, content.length);
          offset += highlightTag.length * 2 + 5;
        }
      } else if (key === "title") {
        let offset = 0;
        for (let i = 0; i < indices.length; i++) {
          let substr = title.substring(
            indices[i][0] + offset,
            indices[i][1] + 1 + offset
          );
          let tag = `<${highlightTag}>` + substr + `</${highlightTag}>`;
          title =
            title.substring(0, indices[i][0] + offset) +
            tag +
            title.substring(indices[i][1] + 1 + offset, content.length);
          offset += highlightTag.length * 2 + 5;
        }
      }
    });

    if (minIndex > 19) {
      content = "..." + content.substr(minIndex - 15);
    }

    results.push({
      uri: item.uri,
      title: title,
      date: item.date,
      context: content,
    });
  }
  return results;
};
