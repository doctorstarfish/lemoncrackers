window.addEventListener("load", init, false);

function init(){

    // Initialise variables
    window.g = {
        displayCap: "50",
        startDate: "1979-01-01",
        endDate: "2100-12-31",
        page: 0
    }
    var now = moment();
    var currentYear = moment().year();
    if (moment().month() < 7){
        currentYear -= 1;
    }

    var dateRanges = {
        'This Pay Period': [moment().startOf('isoweek'), moment().endOf('isoweek')],
        'Last Pay Period': [moment().subtract(1, 'week').startOf('isoweek'), moment().subtract(1, 'week').endOf('isoweek')],
        'Last Pay Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
        'This Financial Year': [moment("01-07-" + currentYear, "DD-MM-YYYY"), moment("30-06" + (currentYear + 1), "DD-MM-YYYY")],
        'Last Financial Year': [moment("01-07-" + (currentYear - 1), "DD-MM-YYYY"), moment("30-06" + currentYear, "DD-MM-YYYY")],
        'All Time': [moment(g.startDate), moment(g.endDate)]
    }

    // Date range picker
    $('#dateshown').html("All Time");

    $('#datepick').daterangepicker(
        {
            locale: {
                format: 'D MMM \'YY'
            },
            startDate: dateRanges['All Time'][0].format("YYYY-MM-DD"),
            endDate: dateRanges['All Time'][1].format("YYYY-MM-DD"),
            opens: 'left',
            ranges: dateRanges
        },

        function (start, end, label){
            if (label.length >= 1){
                $('#dateshown').html(label);
            }else{
                $('#dateshown').html(start.format('MMM D') + ' - ' + end.format('MMM D'));
            }

            g.startDate = start.format("YYYY-MM-DD");
            g.endDate = end.format("YYYY-MM-DD");
            fullRefresh();
        }
    )

    window.g.displayCap = parseInt($("#shift-selector").val());

    // Event listeners
    $("#shift-selector").on("change", shiftSelectHandler);
    $("#next-button").on("click", nextButtonHandler);
    $("#prev-button").on("click", prevButtonHandler);

    // Show data
    fullRefresh();
}

// Called whenever the table widget should be refreshed, retrieves data from server before reflecting changes in HTML
function fullRefresh(){
    console.log("Refreshing display....");

    getRosterTimes()
        .then(getShiftTimes)
        .then(combineData)
        .then(animatePie)
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
        var timeSaved = 0;

        for (shift in rosterOutput){

            var shiftIndex = findShiftIndex(rosterOutput[shift], shiftOutput);
            var rosterObj = rosterOutput[shift];
            var shiftObj = shiftOutput[shiftIndex];
            var error = false;

            // Convert times to Date() objects
            rosterObj["start"] = moment(rosterObj["start"]);
            rosterObj["finish"] = moment(rosterObj["finish"]);
            rosterObj["date"] = moment(rosterObj["date"]);

            // Combine actual shift times into roster object
            if (shiftIndex != -1){
                try {
                    rosterObj["trueStart"] = moment(shiftObj["start"]);
                }catch(errorMessage){
                    rosterObj["startStatus"] = "didn't clock in";
                    error = true;
                }

                try {
                    rosterObj["trueFinish"] = moment(shiftObj["finish"]);
                }catch(errorMessage){
                    rosterObj["finishStatus"] = "didn't clock out";
                    error = true;
                }
            }else{
                rosterObj["startStatus"] = "didn't clock in";
                rosterObj["finishStatus"] = "didn't clock out";
                error = true;
            }

            if (error){
                continue;
            }

            // Calculate time differences between rostered start and actual start
            rosterObj["startDiff"] = rosterObj["trueStart"].diff(rosterObj["start"], 'minutes');
            rosterObj["finishDiff"] = rosterObj["trueFinish"].diff(rosterObj["finish"], 'minutes');

            // Did the shift start early, late or on time?

            if (rosterObj["startDiff"] > 0){
                rosterObj["startStatus"] = "arrived late";
                timeSaved += Math.abs(rosterObj["startDiff"]);
            }else if (rosterObj["startDiff"] < 0){
                rosterObj["startStatus"] = "arrived early"
            }else{
                rosterObj["startStatus"] = "on time";
            }

            if (rosterObj["startDiff"] > 5){
                arriveLate += 1;
            }else {
                punctual += 1;
            }

            // Did the shift end early, late or on time?
            if (rosterObj["finishDiff"] > 0){
                rosterObj["finishStatus"] = "left late";
            }else if (rosterObj["finishDiff"] < 0){
                rosterObj["finishStatus"] = "left early"
                timeSaved += Math.abs(rosterObj.finishDiff);
            }else{
                rosterObj["finishStatus"] = "on time";
            }

            if (rosterObj["finishDiff"] < -5){
                leaveEarly += 1;
            }else{
                punctual += 1;
            }
        }

        // Calculate punctuality
        var punctuality = Math.round(100 * punctual / (rosterOutput.length * 2));

        if (rosterOutput.length == 0){
            punctuality = 100;
        }

        // Calculate time saved


        stats = {
            "arriveLate": arriveLate,
            "leaveEarly": leaveEarly,
            "punctual": punctual,
            "punctualPercent": punctuality,
            "timeSaved" : timeSaved
        };

        // Go on to display data
        console.log("Processing complete...");
        g.data = [rosterOutput, stats];
        resolve();

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
