titles = {"epochtime":0,"timestamp":1,"duration":2,"name":3,"name.previous":4,"country":5,"city":6}
numRequests = 0

// Settings for svg/d3 stuff
var margin = $data.margin;
var width = 700 - margin.left - margin.right;
var height = 700 - margin.top - margin.bottom;
var padding = 20;

// Our data structures
var cityHierarchy = [];
var nodesByCity = {};
var stream;


function initTraffic(div, json) {
    if (stream == null) {
        return;
    }
    drawCircles(div);
}

// Given a list of requests from the same city, add them to the hierarchy
function addDataToHierarchy(dict) {
    var name = dict["name"];
    var children = dict["children"]; 
    var data = nodesByCity[name];
    for (var i = 0; i < data.length; i++) {
        var d = data[i];
        var newEntry = {};
        for (t in titles) {
            newEntry[t] = d[titles[t]];
        }
        newEntry["name"] = (newEntry["duration"]).toString();
        children.push(newEntry);
    }
}


/** The main function. 
    1) Loops through the data from the json file once to create the necessary data structures.
    2) Loops through again to again to create the hierarchy for D3 visualization
*/
function formatData(newData) {

    // Reset data structures
    cityHierarchy = [];
    nodesByCity = {};

    numRequests = newData.length
    console.log("num requests = ", numRequests);

    // Initialize the hierarchy
    cityHierarchy = [];
    cityHierarchy[0] = {};
    cityHierarchy[0]["name"] = "app";
    cityHierarchy[0]["children"] = [];
    var currentLevel = cityHierarchy[0]["children"];

    // Create a list of all countries, create a list of all cities, and create a dictionary
    // with cities as keys and countries as values
    var allCountries = [];
    var allCities = [];
    var cityCountryDict = {};

    for (i = 0; i < newData.length/30; i++) {
        var city = newData[i][titles["city"]]
        var country = newData[i][titles["country"]]

        // List of countries
        if (allCountries.indexOf(country) <= -1) {
            allCountries.push(country);
        }

        // List of cities
        if (allCities.indexOf(city) <= -1) {
            allCities.push(city);
        }

        // Dictionary (key=city, value=country)
        var currentKeys = Object.keys(cityCountryDict)
        if ((city in currentKeys) == false) {
            cityCountryDict[city] = country
        }

        // Dictionary (key=city, value=list of requests from that city)
        if (nodesByCity[city] == null) {
            nodesByCity[city] = [];
            nodesByCity[city].push(newData[i]);
        } else {
            nodesByCity[city].push(newData[i]);
        }
    }

    // Add the countries to the hierarchy
    for (co = 0; co < allCountries.length; co++) {
        currCountry = allCountries[co]
        var newDict = {};
        newDict["name"] = currCountry;
        newDict["children"] = [];
        innerLevel = newDict["children"]

        // Add the cities to the hierarchy
        for (ci = 0; ci < allCities.length; ci++) {
            city = allCities[ci]
            country = cityCountryDict[city]
            if (country == currCountry) {
                var newDict2 = {};
                newDict2["name"] = city;
                newDict2["children"] = [];

                // Add individual data points to the hierarchy 
                addDataToHierarchy(newDict2)
                innerLevel.push(newDict2);
            }
        }
        currentLevel.push(newDict);
    }
}



function drawCircles(div) {

    var bodySelection = d3.select("body");
    var svgSelection = bodySelection.append("svg")
        .attr("width", width)
        .attr("height", width);

    var svg = d3.select("svg"),
            margin = 20,
            diameter = +svg.attr("width"),
            g = svg.append("g").attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

    var color = d3.scale.linear()
        .domain([-1, 5])
        .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
        .interpolate(d3.interpolateHcl);

    var pack = d3.pack()
        .size([diameter - margin, diameter - margin])
        .padding(2);

    // Choose cityHierarchy as our source of data and make the circle sizes equal to request duration
    var root = d3.hierarchy(cityHierarchy[0])
              .sum(function(d) { return d.duration; })
              .sort(function(a, b) { return b.start - a.start; });

    var focus = root,
        nodes = pack(root).descendants(),
        view;

    var duration = 100;
    var delay = 0;

    var circle = g.selectAll("circle")
        .data(nodes)
        .enter().append("circle")
            .attr("class", function(d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
            .style("fill", function(d) { return d.children ? color(d.depth) : null; })
            .on("click", function(d) { if (focus !== d) zoom(d), d3.event.stopPropagation(); })
        .transition()
           .duration(duration)
           .delay(function(d, i) {delay = i * 7; return delay;})
           .attr('transform', function(d) { return 'translate(' + d.x + ','
              + d.y + ')'; })
           .attr('r', function(d) { return d.r; })
        .exit()
           .transition()
           .duration(duration + delay)
           .style('opacity', 0)
           .remove();

    var text = g.selectAll("text")
        .data(nodes)
        .enter().append("text")
            .attr("class", "label")
            .style("fill", "white")
            .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
            .style("display", function(d) { return d.parent === root ? "inline" : "none"; })
            .text(function(d) { return d.data.name; });

    var node = g.selectAll("circle,text");

    svg
        .style("background", color(-1))
        .on("click", function() { zoom(root); });

    zoomTo([root.x, root.y, root.r * 2 + margin]);

    function zoom(d) {
        var focus0 = focus; focus = d;

        var transition = d3.transition()
            .duration(d3.event.altKey ? 7500 : 750)
            .tween("zoom", function(d) {
                var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
                return function(t) { zoomTo(i(t)); };
            });

        transition.selectAll("text")
            .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
                .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
                .each("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
                .each("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
        }

    function zoomTo(v) {
        var k = diameter / v[2]; view = v;
        node.attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
        circle.attr("r", function(d) { return d.r * k; });
    }
}


// This is our main function that calls all the helper functions
function updateTraffic(error, json, div, dimensionIndex) {
    if (error) {
        readout(error);
    } else {
        var now = new Date().getTime();
        div.node().stream = {dimension: dimensionIndex, start: now, wall: now, sleep: 0, first: json[0][0], last: json[json.length-1][0], index: 0, data: json};
        stream = div.node().stream;

        d3.selectAll("svg").remove();

        formatData(json);
        setInterval(initTraffic(div, json), 10000);

    }
}

