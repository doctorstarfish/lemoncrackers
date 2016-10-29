function display(data){
    rosterTimes = data[0];
    stats = data[1];

    var rowCount = rosterTimes.length - g.displayCap * g.page;
    rowCount = Math.min(rowCount, g.displayCap);

    var start = g.page * g.displayCap;
    var end = start + rowCount - 1;
    var message = "Showing " + (start+1) + " to " + (start + rowCount) + " of " + rosterTimes.length + " shifts";

    populateTable(rosterTimes, start, end);
    setButtons(rosterTimes, start, rowCount);
    showStats(stats, message);

    // Pie chart animation
    var count = 0;
    var ticker = setInterval(redrawPie, 12);
    function redrawPie(){
        drawPie(count);
        count += 1;

        if (count == stats.punctualPercent){
            clearInterval(ticker);
        }
    }
}

function populateTable(rosterTimes, start, end){
    // Clear table
    $("#rosterTable").get(0).innerHTML = "";

    // Loop through data to add rows
    for (var i = start; i <= end; i++){
        var rosterObj = rosterTimes[i];

        // Make row elements
        var newRow = document.createElement('tr');
        var dateCell = document.createElement('td');
        var rosterStartCell = document.createElement('td');
        var actualStartCell = document.createElement('td');
        var actualStartLabel = document.createElement('span');
        var rosterFinishCell = document.createElement('td');
        var actualFinishCell = document.createElement('td');
        var actualFinishLabel = document.createElement('span');

        // Structure
        newRow.appendChild(dateCell);
        newRow.appendChild(rosterStartCell);
        newRow.appendChild(actualStartCell);
        newRow.appendChild(rosterFinishCell);
        newRow.appendChild(actualFinishCell);

        // Fill content
        dateCell.innerHTML = rosterObj["date"].format("MMMM Do YYYY");
        rosterStartCell.innerHTML = rosterObj["start"].format("h:mmA");
        rosterFinishCell.innerHTML = rosterObj["finish"].format("h:mmA");

        actualStartCell.innerHTML = rosterObj["startStatus"];
        actualFinishCell.innerHTML = rosterObj["finishStatus"];

        // Labels
        actualStartCell.appendChild(actualStartLabel);
        actualFinishCell.appendChild(actualFinishLabel);
        actualStartLabel.setAttribute("class", "label label-warning");
        actualFinishLabel.setAttribute("class", "label label-warning");
        actualStartLabel.setAttribute("data-toggle", "tooltip");
        actualStartLabel.setAttribute("data-placement", "top");
        actualFinishLabel.setAttribute("data-toggle", "tooltip");
        actualFinishLabel.setAttribute("data-placement", "top");

        if (rosterObj["startStatus"] == "arrived late" && Math.abs(rosterObj["startDiff"]) == 1){
            actualStartLabel.innerHTML = "a minute";
            actualStartLabel.setAttribute("title", rosterObj["trueStart"].format("h:mmA"));

        }else if (rosterObj["startStatus"] == "arrived late" && Math.abs(rosterObj["startDiff"]) > 1){
            actualStartLabel.innerHTML = Math.abs(rosterObj["startDiff"]) + " minutes";
            actualStartLabel.setAttribute("title", rosterObj["trueStart"].format("h:mmA"));
        }

        if (rosterObj["finishStatus"] == "left early" && Math.abs(rosterObj["finishDiff"]) == 1){
            actualFinishLabel.innerHTML = "a minute";
            actualFinishLabel.setAttribute("title", rosterObj["trueFinish"].format("h:mmA"));
        }else if (rosterObj["finishStatus"] == "left early" && Math.abs(rosterObj["finishDiff"]) > 1){
            actualFinishLabel.innerHTML = Math.abs(rosterObj["finishDiff"]) + " minutes";
            actualFinishLabel.setAttribute("title", rosterObj["trueFinish"].format("h:mmA"));
        }

        $(function () {
            $('[data-toggle="tooltip"]').tooltip();
        });

        // Add to page
        $('#rosterTable').get(0).appendChild(newRow);
    }
}

function showStats(stats, message){
    $("#showing").get(0).innerHTML = message;

    $("#late-display").get(0).innerHTML = stats.arriveLate;
    $("#early-display").get(0).innerHTML = stats.leaveEarly;
    $("#punctual-display").get(0).innerHTML = stats.punctual;
    $("#punc-text").get(0).innerHTML = stats.punctualPercent;
}

function setButtons(rosterTimes, start, rowCount){
    if (rosterTimes.length > start + rowCount){
        $("#next-button").removeAttr("disabled");
    }else{
        $("#next-button").attr("disabled", "disabled");
    }

    if (g.page > 0){
        $("#prev-button").removeAttr("disabled");
    }else{
        $("#prev-button").attr("disabled", "disabled");
    }
}

function drawPie(percent){
    // Initial variables
    var canvas = document.getElementById("punc-pie");
    var ctx = canvas.getContext('2d');

    // Reset the canvas
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 110, 110);

    // Draw base circle
    ctx.arc(55, 55, 55, 0, 2 * Math.PI, true);
    ctx.fillStyle = "#E9F6F6";
    ctx.fill();

    // Draw pie circuit
    ctx.beginPath();
    ctx.moveTo(55, 55);
    ctx.arc(55, 55, 55, -Math.PI/2, (-Math.PI/2) + (percent)/100 * Math.PI * 2);
    ctx.fillStyle= "#009ED9";
    ctx.lineTo(55, 55);
    ctx.fill();

    // Draw white circle
    ctx.beginPath();
    ctx.arc(55, 55, 42, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Draw percentage text
    ctx.fillStyle = "#00B3F1";
    ctx.font = "bold 38px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(percent), 55, 69);

}
