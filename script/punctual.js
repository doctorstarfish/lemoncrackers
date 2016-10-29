window.addEventListener("load", init, false);

function init(){

    // Initialise variables
    window.g = {
        displayCap: "50",
        startDate: "1979-01-01",
        endDate: "2016-12-31",
        page: 0
    }

    // Date range picker
    $('input[name="daterange"]').daterangepicker(
        {
            locale: {
                format: 'YYYY-MM-DD'
            },
            startDate: '2013-09-01',
            endDate: '2013-11-30',
            opens: 'left'
        },

        function (start, end, label){
            g.startDate = start.format("YYYY-MM-DD");
            g.endDate = end.format("YYYY-MM-DD");
            refresh();
        }
    )

    window.g.displayCap = parseInt($("#shift-selector").val());

    // Event listeners
    $("#shift-selector").on("change", shiftSelectHandler);
    $("#next-button").on("click", nextButtonHandler);
    $("#prev-button").on("click", prevButtonHandler);

    // Show data
    refresh();
}

// Called whenever the table widget should be refreshed, retrieves data from server before reflecting changes in HTML
function refresh(){
    console.log("Refreshing display....");

    getRosterTimes()
        .then(getShiftTimes)
        .then(combineData)
        .then(display)
        .catch(error);
}

// Asynchronous function which resolves when roster data is retrived from server
function getRosterTimes(){
    var rosterUrl = "http://localhost:4567/rosters/" + g.startDate + "/"  + g.endDate;

    return new Promise(function(resolve, reject){
        $.ajax(rosterUrl, {success: resolve, error: reject, dataType: 'text'});
    });
}

// Asynchronous function which resolves when shift data is retrived from server
function getShiftTimes(rosterOutput){
    console.log("Roster data retrieved...");
    var shiftUrl = "http://localhost:4567/shifts/" + g.startDate + "/"  + g.endDate;
    rosterOutput = $.parseJSON(rosterOutput);

    return new Promise(function(resolve, reject){
        $.ajax(shiftUrl, {success: function(data){resolve([data, rosterOutput]);}, error: reject, dataType: 'text'});
    });
}

// Processes retrieved shift and roster data before passing to display function
function combineData(data){
    return new Promise(function(resolve, reject){

        shiftOutput = data[0];
        rosterOutput = data[1];

        shiftOutput = $.parseJSON(shiftOutput);

        console.log("Shift data retrieved...");

        // Process data
        var arriveLate = 0;
        var leaveEarly = 0;
        var punctual = 0;

        for (shift in rosterOutput){

            var shiftIndex = findShiftIndex(rosterOutput[shift], shiftOutput);
            var rosterObj = rosterOutput[shift];
            var shiftObj = shiftOutput[shiftIndex];

            // Combine actual shift times into roster object
            if (shiftIndex != -1){
                rosterObj["trueStart"] = moment(shiftObj["start"]);
                rosterObj["trueFinish"] = moment(shiftObj["finish"]);
            }else{
                rosterObj["trueStart"] = moment("Unknown");
                rosterObj["trueFinish"] = moment("Unknown");
            }

            // Convert times to Date() objects
            rosterObj["start"] = moment(rosterObj["start"]);
            rosterObj["finish"] = moment(rosterObj["finish"]);
            rosterObj["date"] = moment(rosterObj["date"]);

            // Calculate time differences between rostered start and actual start
            rosterObj["startDiff"] = rosterObj["trueStart"].diff(rosterObj["start"], 'minutes');
            rosterObj["finishDiff"] = rosterObj["trueFinish"].diff(rosterObj["finish"], 'minutes');

            // Did the shift start early, late or on time?
            if (rosterObj["startDiff"] > 0){
                rosterObj["startStatus"] = "arrived late";
                arriveLate += 1;
            }else if (rosterObj["startDiff"] < 0){
                rosterObj["startStatus"] = "arrived early"
                punctual += 1;
            }else{
                rosterObj["startStatus"] = "on time";
                punctual += 1;
            }


            // Did the shift end early, late or on time?
            if (rosterObj["finishDiff"] > 0){
                rosterObj["finishStatus"] = "left late";
                punctual += 1;
            }else if (rosterObj["finishDiff"] < 0){
                rosterObj["finishStatus"] = "left early"
                leaveEarly += 1;
            }else{
                rosterObj["finishStatus"] = "on time";
                punctual += 1;
            }
        }

        var punctuality = Math.round(100 * punctual / (rosterOutput.length * 2));

        stats = {
            "arriveLate": arriveLate,
            "leaveEarly": leaveEarly,
            "punctual": punctual,
            "punctualPercent": punctuality,
        };

        // Go on to display data
        console.log("Processing complete...");
        resolve([rosterOutput, stats]);

    });
}

function error(errorMessage){
    console.log(errorMessage);
}

function findShiftIndex(rosteredShift, actualShifts){

    for (i in actualShifts){
        if (actualShifts[i]["date"] == rosteredShift["date"]){
            return i;
        }
    }

    return -1;
}
