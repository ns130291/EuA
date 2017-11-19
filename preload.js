"use strict";

var loadingDone = false;
var json;
var mainLoaded;
preload();

function preload() {
    console.log("starting preload " + new Date().getTime());
    var location = window.location.search;
    if (location !== null && location !== "") {
        var regYear = new RegExp("year=(\\d{4})");
        var regMonth = new RegExp("month=(\\d{1,2})");
        var year = regYear.exec(location);
        var month = regMonth.exec(location);
        if (month !== null && month.length === 2 && month[1] >= 1 && month[1] <= 12 && year !== null && year.length === 2) {
            var url = "api.php";

            var params = `action=get_month&month=${month[1]}&year=${year[1]}`;

            var xhr = new XMLHttpRequest();
            xhr.open("POST", url, true);

            //Send the proper header information along with the request
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");

            xhr.onload = function() {
                if (xhr.status === 200) {
                    json = JSON.parse(xhr.response);
                    if (json['error'] === undefined) {
                        loadingDone = true;
                        console.log("preload DONE");
                        if (mainLoaded === true) {
                            showEntries();
                            console.log("preload main already finished");
                        }
                    }
                    else {
                        loadingDone = "error";
                        console.log("preload error");
                    }
                }
                else {
                    loadingDone = "error";
                    console.log("preload error");
                }
            };
            xhr.onerror = function() {
                loadingDone = "error";
                console.log("preload error");
            };

            xhr.send(params);
        }
        else {
            loadingDone = "error";
            console.log("preload error");
        }
    }
    else {
        loadingDone = "error";
        console.log("preload error");
    }
}
