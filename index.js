const rp = require("request-promise");
const cheerio = require("cheerio");
const moment = require("moment");

var options = {
  uri:
    "https://classic.sportsbookreview.com/betting-odds/nhl-hockey/?data=20170101",
  transform: function(body) {
    return cheerio.load(body);
  }
};

const contentStatuses = {
  "content-delayed": "delayed",
  "content-in-progress": "in-progress",
  "content-final": "completed",
  "content-scheduled": "scheduled",
  "content-suspended": "canceled"
};

const unusedColumnsNames = [
  "eventLink",
  "score-content",
  "check",
  "rotation",
  "time",
  "clearBoth"
];

const fixTime = (day, time) => {
  const notFormatedTime = `${day} ${time}m`;
  return moment(notFormatedTime, "dddd, MMMM DD, YYYY, h:mma").format();
};

(async () => {
  const result = [];
  try {
    const $ = await rp(options);
    $(".sportGroup")
      .find(".dateGroup")
      .each((i, tableDiv) => {
        const currentDate = $(tableDiv)
          .first(".leagueByDate")
          .find(".date")
          .html();
        console.log(currentDate);

        $(tableDiv)
          .find(".eventLines")
          .children()
          .each((j, rowBlock) => {
            if (rowBlock.children.length) {
              const rowClassArray = $(rowBlock)
                .attr("class")
                .split(" ");
              const rowStatus = rowClassArray.length
                ? contentStatuses[rowClassArray[0]]
                : contentStatuses[rowClassArray];

              $(rowBlock)
                .find(".eventLine")
                .each((k, rowDiv) => {
                  const row = { status: rowStatus, book: [] };
                  const eventUrls = $(rowDiv).find("a");
                  row.url = eventUrls.length ? eventUrls[0].attribs.href : null;

                  $(rowDiv)
                    .children()
                    .each((k, rowColumn) => {
                      const columnsClass = $(rowColumn)
                        .attr("class")
                        .replace("el-div eventLine-", "");

                      if (columnsClass === "time") {
                        row.time = fixTime(currentDate, $(rowColumn).text());
                      }

                      if (!unusedColumnsNames.includes(columnsClass)) {
                        const rowsInColumn = [];
                        $(rowColumn)
                          .children()
                          .each((k, rowInColumn) => {
                            const textInColumn = $(rowInColumn)
                              .text()
                              .trim();
                            if (textInColumn && textInColumn !== "Options") {
                              rowsInColumn.push(textInColumn);
                            }
                          });

                        if (rowsInColumn.length) {
                          if (columnsClass === "book") {
                            row.book.push(rowsInColumn);
                          } else {
                            row[columnsClass] = rowsInColumn;
                          }
                        }
                      }
                    });

                  result.push(row);
                });
            }
          });
      });
  } catch (err) {
    console.log(err);
  }
  console.log(result);
})();
