const LOCALSTORAGEKEY = "keys";

$(".useMe").click(({ target }) => {
  $("#surveyJSDBid").val($(target).data().dbid);
  $("#surveyJSDBaccessKey").val($(target).data().dbaccesskey);
  start();
});

$("#clearID").click(() => {
  window.localStorage.removeItem(LOCALSTORAGEKEY);
  loadIDHolder();
});

$("#startButton").click(() => start());

function loadIDHolder() {
  const keys = JSON.parse(window.localStorage.getItem(LOCALSTORAGEKEY));
  $("#firstKeyRow")
    .nextAll()
    .remove();
  if (keys) {
    $("#keyRowList").show();
    let appendingHTML = "";
    keys.forEach(({ dbID, dbaccessKey }) => {
      appendingHTML += `
        <div class="row">
            <div class="col-5 wordBreak">
                    ${dbID}
            </div>
                <div class="col-5 wordBreak">
                    ${dbaccessKey}
                </div>
                <div class="col-2">
                    <button class="btn btn-success btn-sm useMe" data-dbID="${dbID}" data-dbaccessKey="${dbaccessKey}">Use me</button>
                </div>
            </div>
        </div>
    `;
    });
    $("#firstKeyRow").after(appendingHTML);
  } else $("#keyRowList").hide();
}
loadIDHolder();

function start() {
  var dbID = $("#surveyJSDBid").val();
  var dbaccessKey = $("#surveyJSDBaccessKey").val();
  if (dbID && dbaccessKey) {
    $("#surveyJSDBid, #surveyJSDBaccessKey, #startButton").prop(
      "disabled",
      true
    );
    $("#firstLoading").show();
    data
      .getData(dbID, dbaccessKey)
      .then(data => {
        let keyArray = JSON.parse(window.localStorage.getItem(LOCALSTORAGEKEY));
        if (!keyArray) keyArray = [];
        if (
          !keyArray.find(
            key => key.dbID == dbID && key.dbaccessKey == dbaccessKey
          )
        ) {
          keyArray.push({ dbID, dbaccessKey });
          window.localStorage.setItem(
            LOCALSTORAGEKEY,
            JSON.stringify(keyArray)
          );
          loadIDHolder();
        }
        if (data.length == 0) alert("No data");
        else mainPageProcessing();
      })
      .catch(value => {
        console.log(value);
        alert("Invalid dbID/dbaccessKey");
      })
      .finally(() => {
        $("#surveyJSDBid, #surveyJSDBaccessKey, #startButton").prop(
          "disabled",
          false
        );
        $("#firstLoading").hide();
      });
  } else alert("Empty dbID/dbaccessKey");
}

function mainPageProcessing() {
    $(".firstPage").hide()
}

const data = new (class {
  dbRootURL = "https://dxsurvey.com/api/MySurveys/getSurveyResults/";
  ajaxData = [];
  getData(
    dbID = "89c190aa-9d8b-4d34-af41-61f602d54a9b",
    // dbID = "b24f158e-9e9f-467b-a5a6-060b10228b4a", //Empty
    dbaccessKey = "4d09c11a98484a91b9182b2f6bff76c9"
  ) {
    return new Promise((resolve, reject) => {
      $.ajax({
        type: "GET",
        url: `${this.dbRootURL + dbID}?accessKey=${dbaccessKey}`,
        dataType: "json"
      })
        .done(value => {
          console.log(value);
          this.ajaxData = value.Data;
          resolve(value.Data);
        })
        .fail((jqXHR, textStatus, errorThrown) =>
          reject(new Error(textStatus))
        );
    });
  }
})();
