// @ts-check

export const getSearch = (
  /** @type {{highlightTag: string, maxResultLength: number}} */ options
) => {
  const { highlightTag, maxResultLength } = options;
  return (query) => {
    const results = [];
    const rows = self._index.search(query);

    if (rows.length > 0 && !!rows[0].matches) {
      rows.forEach((x) => {
        x.matches.sort((a, b) => a.indices[0][2] - b.indices[0][2]);
      });

      rows.sort((a, b) => {
        const res = a.matches[0].indices[0][2] - b.matches[0].indices[0][2];
        if (res === 0) {
          return a.item.date !== b.item.date
            ? b.item.date.localeCompare(a.item.date)
            : a.item.score - b.item.score;
        }

        return res;
      });
    }

    for (let i = 0; i < Math.min(rows.length, maxResultLength); i++) {
      let { item, matches } = rows[i];
      let title = item.title;
      let content = item.content;
      let minIndex = content.length;
      let offsetContent = 0;
      let offsetTitle = 0;

      const toHighlight = (text, indices, offset) => {
        let lastLast = 0;
        for (let i = 0; i < indices.length; i++) {
          if (indices[i][0] < lastLast) {
            if (indices[i][1] > lastLast) {
              lastLast = indices[i][1];
            }
            continue;
          }
          lastLast = indices[i][1];

          let substr = text.substring(
            indices[i][0] + offset,
            indices[i][1] + 1 + offset
          );
          let tag = `<${highlightTag}>` + substr + `</${highlightTag}>`;
          text =
            text.substring(0, indices[i][0] + offset) +
            tag +
            text.substring(indices[i][1] + 1 + offset, text.length);
          offset += highlightTag.length * 2 + 5;
        }
        return [text, offset];
      };

      matches.forEach(({ indices, key }) => {
        if (key === "content") {
          if (indices[0][0] < minIndex) {
            minIndex = indices[0][0];
          }
          [content, offsetContent] = toHighlight(
            content,
            indices,
            offsetContent
          );
        } else if (key === "title") {
          [title, offsetTitle] = toHighlight(title, indices, offsetTitle);
        }
      });

      if (minIndex > 20) {
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
};
