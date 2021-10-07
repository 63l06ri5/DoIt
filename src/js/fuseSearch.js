// @ts-check

import { getSearch } from "./helpers";

let search;

self.onmessage = (e) => {
  switch (e.data.type) {
    case "init":
      importScripts("../lib/fuse/fuse.min.js");
      self.fuseSearchThrothlePeriod = e.data.data.fuseSearchThrothlePeriod;
      const maxResultLength = e.data.data.maxResultLength;
      const highlightTag = e.data.data.highlightTag;
      // @ts-ignore
      self._index = new Fuse(e.data.data.data, e.data.data.options);
      search = getSearch({ maxResultLength, highlightTag });
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
  }, self.fuseSearchThrothlePeriod);
};
