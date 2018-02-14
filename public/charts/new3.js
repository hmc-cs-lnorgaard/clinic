/**

TODO: fix data so that start and end works for every json file, not just some

1) The data is in the JSON file we clicked on
2) We want to reorganize the data in the JSON file in a few ways:
    a) Create a list of the pages (URLs) that have requests: allPages
    b) Create a dictionary with pages as keys and the requests as values: nodesByPage
    c) Create a hierarchy of pages: pageHierarchy
3) To create a circle packing visualization, we want to recursively create circles
    within each other using the hierarchy. The size of the circle depends on the start
    and end time of the request.

*/
titles = {"epochtime":0,"timestamp":1,"duration":2,"name":3,"name.previous":4,"country":5,"city":6}
numRequests = 0

// Settings for svg/d3 stuff
var margin = $data.margin;
var width = 900 - margin.left - margin.right;
var height = 900 - margin.top - margin.bottom;
var padding = 20;

// Our data structures
var pageHierarchy = [];
var nodesByCity = {};
var stream;


function initTraffic(div) {
    console.log("here");
    if (stream == null) {
        console.log("null");
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


/** Empties and repopulates nodesByPage dictionary 
        newData: all the data, formatted like the json file
        nodesByPage: dictionary of all the requests data with pages as keys
*/
function formatData(newData) {
    numRequests = newData.length
    console.log("num requests = ", numRequests);

    // Initialize the hierarchy
    pageHierarchy = [];
    pageHierarchy[0] = {};
    pageHierarchy[0]["name"] = "app";
    pageHierarchy[0]["children"] = [];
    var currentLevel = pageHierarchy[0]["children"];

    // Create a list of all countries, create a list of all cities, and create a dictionary
    // with cities as keys and countries as values
    var allCountries = [];
    var allCities = [];
    var cityCountryDict = {};

    for (i = 0; i < newData.length; i++) {
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

    console.log("countries: ", allCountries);
    console.log("cities: ", allCities);
    console.log("cityCountryDict: ", cityCountryDict);
    console.log("nodesByCity: ", nodesByCity)

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
                addDataToHierarchy(newDict2)
                innerLevel.push(newDict2);
            }
        }
        currentLevel.push(newDict);
    }
    console.log("pageHierarchy: ", pageHierarchy);
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

    var root = d3.hierarchy(pageHierarchy[0])
              .sum(function(d) { return d.duration; })
              .sort(function(a, b) { return b.start - a.start; });

    var focus = root,
        nodes = pack(root).descendants(),
        view;

    var circle = g.selectAll("circle")
        .data(nodes)
        .enter().append("circle")
            .attr("class", function(d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
            .style("fill", function(d) { return d.children ? color(d.depth) : null; })
            .on("click", function(d) { if (focus !== d) zoom(d), d3.event.stopPropagation(); });

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
        setInterval(initTraffic(div), 1000);

    }
}

