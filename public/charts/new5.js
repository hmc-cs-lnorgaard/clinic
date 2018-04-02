titles = {"epochtime":0,"timestamp":1,"duration":2,"name":3,"name.previous":4,"country":5,"city":6}
numRequests = 0

// Default size & coloring settings from Marimekko demo: https://www.jasondavies.com/mekko/
var margin = {top: 10, right: 20, bottom: 30, left: 60},
    width = 1200 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    color = d3.scale.category20b(),
    /**color = d3.scale.ordinal()
        .domain(["1450"])
        .range(["#1a9850", "#66bd63", "#a6d96a","#d9ef8b","#ffffbf","#fee08b","#fdae61","#f46d43","#d73027"]),*/
    n = d3.format(",.0f"),
    p = d3.format("%");


var index = 0; // start at the record after the header
var serialId = 1000; // Serial id assigned to each event
var data = []; // where we are keeping the list of dictionaries (our data)
var featureIndices = {};
var notInitialized = true;
var json1 = null;


// Changed this so it's only called once. 
function initTraffic(div, json) {
    buildView(div);
}

// Create a new entry that is properly formatted and add it to the list holding current data
function addPage(page) {
    if (notInitialized) {
        for (i=0; i<json1.length; i++) {
            var feature1 = json1[i][titles["name"]];
            if (feature1 == null) {feature1 = "null";}
            var feature2 = json1[i][titles["country"]];
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
    var feature1 = page[titles["name"]];
    if (feature1 == null) {feature1 = "null";}
    var feature2 = page[titles["country"]];
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
            .style("fill", function(d) { return d.children ? null : color(d.segment); });

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
        addPage(json[index++])
    }
    if (lim < json.length-1) transition();
}