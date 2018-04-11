titles = {"epochtime":0,"timestamp":1,"duration":2,"name":3,"name.previous":4,"country":5,"city":6}
numRequests = 0

// Default size & coloring settings from Marimekko demo: https://www.jasondavies.com/mekko/
var margin = {top: 10, right: 20, bottom: 30, left: 60},
    width = 1000 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    color = d3.scale.category20b(),
    n = d3.format(",.0f"),
    p = d3.format("%");


var index = 0; // start at the record after the header
var serialId = 1000; // Serial id assigned to each event
var data = []; // where we are keeping the list of dictionaries (our data)
var featureIndices = {};
var notInitialized = true;
var json1 = null;

var x = "name";
var y = "country";

var selectedX = titles[x];
var selectedY = titles[y];

function restartEverything() {
    d3.select("svg").remove();
    index = 0; // start at the record after the header
    serialId = 1000; // Serial id assigned to each event
    data = []; // where we are keeping the list of dictionaries (our data)
    featureIndices = {};
    notInitialized = true;
    buildView();
}

function addSelects() {
    // Create 2 dropdowns that change the x and y axes
    var text1 = document.createTextNode("X-axis");
    var newDiv=document.createElement('div');
    var text2 = document.createTextNode("Y-axis");
    var newDiv2=document.createElement('div');
    
    var html = '<select id="xAxis">', html2 = '<select id="yAxis">', i;
    for (i = 0; i < Object.keys(titles).length; i++) {
        var feature = Object.keys(titles)[i]
        html += "<option value='"+feature+"'>"+feature+"</option>";
        html2 += "<option value='"+feature+"'>"+feature+"</option>";
    }
    html += '</select>';
    html2 += '</select>';
    newDiv.innerHTML= html;
    newDiv2.innerHTML= html2;
    document.getElementById("feature").appendChild(text1);
    document.getElementById("feature").appendChild(newDiv);
    document.getElementById("feature").appendChild(text2);
    document.getElementById("feature").appendChild(newDiv2);

    // Make the dropdowns default to "name" and "country"
    document.getElementById("xAxis").value = x;
    document.getElementById("yAxis").value = y;

    // Change the chart when x is changed in the dropdown
    document.getElementById("xAxis").onchange = function() {
        x = document.getElementById("xAxis").value;
        selectedX = titles[x];
        restartEverything();
        return false;
    };

    // Change the chart when y is changed in the dropdown
    document.getElementById("yAxis").onchange = function() {
        y = document.getElementById("yAxis").value;
        selectedY = titles[y];
        restartEverything();
        return false;
    };
}


// Changed this so it's only called once. 
function initTraffic(div, json) {
    addSelects();
    buildView(div);
}

// Create a new entry that is properly formatted and add it to the list holding current data
function addPage(page) {
    if (notInitialized) {
        for (i=0; i<json1.length; i++) {
            var feature1 = json1[i][selectedX];
            if (feature1 == null) {feature1 = "null";}
            var feature2 = json1[i][selectedY];
            if (feature2 == null) {feature2 = "null";}
            
            var newString = feature1.concat(feature2);

            if (newString in featureIndices) {
                // do nothing
            } else {
                var pageNode = {
                    id: String(serialId++),
                    market: feature1,
                    segment: feature2,
                    value: 0
                }
                var newIndexForDictionary = data.length;
                featureIndices[newString] = newIndexForDictionary;
                data[newIndexForDictionary] = pageNode;
            }
        }
        notInitialized = false;
    }

    // Make sure none of the feature values are null
    var feature1 = page[selectedX];
    if (feature1 == null) {feature1 = "null";}
    var feature2 = page[selectedY];
    if (feature2 == null) {feature2 = "null";}
    var feature3 = page[titles["duration"]];
    if (feature3 == null) {return;}
    
    var newString = feature1.concat(feature2);

    if (newString in featureIndices) {
        currGroup = data[featureIndices[newString]];
        if (currGroup["market"] == feature1) {
            if (currGroup["segment"] == feature2) {
                currGroup["value"] = currGroup["value"] + feature3
            } else {
                console.log("this shouldn't happen");
                return;
            }
        } else {
            console.log("this shouldn't happen");
            return;
        }
    } else {
        console.log("this shouldn't happen");
        return;
    }
}

// Remove an entry that is out of scope
function removePage(page) {
    // Make sure none of the feature values are null
    var feature1 = page[selectedX];
    if (feature1 == null) {feature1 = "null";}
    var feature2 = page[selectedY];
    if (feature2 == null) {feature2 = "null";}
    var feature3 = page[titles["duration"]];
    if (feature3 == null) {return;}
    
    var newString = feature1.concat(feature2);

    if (newString in featureIndices) {
        currGroup = data[featureIndices[newString]];
        if (currGroup["market"] == feature1) {
            if (currGroup["segment"] == feature2) {
                currGroup["value"] = currGroup["value"] - feature3;
            } else {
                console.log("this shouldn't happen");
                return;
            }
        } else {
            console.log("this shouldn't happen");
            return;
        }
    } else {
        console.log("this shouldn't happen");
        return;
    }
}


/*
 * Build the viewport where the chart is created.
 * This only gets called once.
 */
function buildView(div) {
    nest = d3.nest()
        .key(function(d) { return d.market; })
        .key(function(d) { return d.segment; });

    treemap = d3.layout.treemap()
        .mode("slice-dice")
        .size([width, height])
        .children(function(d) { return d.values; })
        .sort(null);

    svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("margin-left", margin.left + "px")
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .datum({values: nest.entries(data)})
            .call(chart);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + treemap.size()[1] + ")")
        .call(d3.svg.axis().scale(d3.scale.linear().range([0, treemap.size()[0]])).tickFormat(d3.format("%")));

    svg.append("g")
        .attr("class", "y axis")
        .call(d3.svg.axis().scale(d3.scale.linear().range([treemap.size()[1], 0])).tickFormat(d3.format("%")).orient("left"));
}


function chart(selection) {
    selection.each(function() {

        cell = d3.select(this).selectAll("g.cell")
            .data(treemap.nodes);

        cellEnter = cell.enter().append("g")
            .attr("class", "cell")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        cellEnter.filter(function(d) { return d.depth > 2; }).append("rect")
            .style("fill", function(d) { return d.children ? null : color(d.market); });

        cellEnter.append("title");

        d3.transition(cell)
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
          .select("rect")
            .attr("width", function(d) { return d.dx; })
            .attr("height", function(d) { return d.dy; });

        cell.select("title")
            .text(function(d) { return d.children ? null : title(d); });

        d3.transition(cell.exit())
            .attr("width", 1e-6)
            .attr("height", 1e-6)
            .remove();
    });
}

function title(d) {
    return d.market + ", " + d.segment + ", " + d.value;
}

// update the graph every 50 points
function transition() {
    svg.datum({values: nest.entries(data)})
      .transition()
      .duration(1000)
      .call(chart);
}


// This adds a chunk of pages to the hierarchy and then updates the view.  Meant to
// be called on a timer.
function updateTraffic(json) {
    json1 = json;
    lim = Math.min(index + 50, json.length-1)
    while (index < lim) {
        addPage(json[index++]);
        pastIndex = index - 100; // show 100 points at a time
        if (pastIndex >= 0) {
            removePage(json[pastIndex]);
        }
    }
    if (lim < json.length-1) {
        transition();
    }
}