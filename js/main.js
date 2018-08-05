/**  
 * Visualization SemB 2018 Final Project made by:
 * Amar Moriya
 * Fishman Stas
 * Koifman Roman
 */

/**  
 * References
 * WorldMap with zoom slider based on http://bl.ocks.org/nivas8292/bec8b161587cb62e9fda 
 * Time Slider based on http://bl.ocks.org/cmdoptesc/fc0e318ce7992bed7ca8 
 */

var minYear = 1918, maxYear = 2018;     // Define years range for the time slider. 
var currentYear = minYear;              // The current pointed year.
var comboboxes;                         // Legend's combobox group.
var dateStringFormat = "DD/MM/YYYY";    // Unified date format for all Natural Disasters.

var errMsg1 = "Fatal Error: Failed loading files: ";
var errMsg2 = "\n\nTwo possible causes:\n1. You didn't run the project within Local Server."
    + "\n2. You moved or renamed project's data files." +
    "\n\nCheck that data files are in correct location and run main.html from Local Server!";
var failedFiles = [];   // Add failed loaded csv files here.

/* On window resize, redrwar map, rebuild time slider, and redraw the natural disasters */
$(window).resize(function () {
    //location.reload(true);
    drawMap();
    buildTimeSlider();
    parseAll();
});

/* Draw the map by using topojson and d3 geo */
var center, projection, path, svg, g, height, width;
function drawMap() {
    $("#svg-map").remove();     // remove old map (for resizing)
    width = d3.select('#map').node().getBoundingClientRect().width;
    height = d3.select('#map').node().getBoundingClientRect().height;
    center = [width / 2, height / 2];
    projection = d3.geo.equirectangular().scale(height / Math.PI).translate(center);
    path = d3.geo.path().projection(projection);
    svg = d3.select("#map").append("svg").attr("id", 'svg-map');
    g = svg.append("g");

    /* Read world map json and draw the map */
    d3.json("data/world-110m.json", async function (error, topology) {
        if (error != null) {
            //console.log(error);
            failedFiles.push("data/world-110m.json");
            return;
        }
        g.selectAll("path")
            .data(topojson.object(topology, topology.objects.countries).geometries)
            .enter()
            .append("path")
            .attr("d", path);
    });
    applyZoomSettings();        // apply zoom settings on current resized map.
}

/**
 * Class Phenomenon which represent a Natural Disaster
 * @param {*} type 
 * @param {*} date 
 * @param {*} time 
 * @param {*} severity 
 */
function Phenomenon(type, color, date, time, severity, longitude, latitude) {
    this.Type = type;
    this.Color = color;
    this.Date = date;
    this.Time = time;
    this.Severity = parseFloat(severity);
    this.Longitude = parseFloat(longitude);
    this.Latitude = parseFloat(latitude);
    if (isNaN(this.Severity) || isNaN(this.Longitude) || isNaN(this.Latitude) || this.Severity < 0) {
        var err = "Bad Parameters: " + this.Severity + ", " + this.Longitude + ", " + this.Latitude;
        console.log(err);
        throw err;
    }
}

var tooltip = d3.select("body").append("div").attr("class", "tooltip");        // create tooltip div

/* Enable ToolTip */
function enableToolTip(text, color) {
    if (color == undefined)
        color = "darkgreen";
    tooltip.style("border-color", color);
    tooltip.transition()
        .style("border-color", color)
        .duration(300)
        .style("opacity", .9);
    tooltip.html("<b>" + text + "</b>")
        .style("left", (d3.event.pageX + 5) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
}

/* Disable ToolTip */
function disableToolTip() {
    tooltip.transition()
        .duration(500)
        .style("opacity", 0)
        .style("border-color", "darkblue");
}


// Global arrays for Phenomenon and thier scales.
var naturalDisasters, earthquakes, tsunami, cyclone, volcan;
var eqScale, cScale, tScale, vScale;

/**
 * Initialization function - happens once whe document fully loaded .
 * This is where we read our datasets.s
 * */
$(document).ready(function () {
    drawMap();      // draw map by topojson.
    $('#yearsNumTitle').text(maxYear - minYear);
    buildTimeSlider();
    comboboxes = [$("#cb-1"), $("#cb-2"), $("#cb-3"), $("#cb-4")];

    /* Parse Earthquakes Data */
    var fileName = "data/earthquakes.csv";
    d3.csv(fileName, async function (error, eqs) {
        if (error != null) {
            //console.log(error);
            failedFiles.push(fileName);
            return;
        }
        earthquakes = [];
        var max = d3.max(eqs, function (d) { return d.Magnitude; });
        var min = d3.min(eqs, function (d) { return d.Magnitude; });
        eqScale = d3.scale.linear().domain([min, max]).range([3, 10]);
        eqs.forEach(function (e) {
            var s = parseFloat(e.Magnitude);
            var lon = parseFloat(e.Longitude);
            var lat = parseFloat(e.Latitude);
            var dateStr = moment(e.Date, "MM DD YYYY").format(dateStringFormat);
            if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {
                earthquakes.push(new Phenomenon("Earthquake", "brown", dateStr, e.Time, eqScale(s), lon, lat));
            }
        });
        var oldEq = [];
        fileName = "data/olderEarthquakes.csv";
        d3.csv(fileName, function (error, oeqs) {
            if (error != null) {
                //console.log(error);
                failedFiles.push(fileName);
                return;
            }
            oeqs.forEach(function (e) {
                var s = parseFloat(e.mag);
                var lon = parseFloat(e.longitude);
                var lat = parseFloat(e.latitude);
                var dateStr = moment(e.time.substr(0, 10), "YYYY MM DD").format(dateStringFormat);
                var timeStr = e.time.substring(11, 16);
                if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {
                    oldEq.push(new Phenomenon("Earthquake", "brown", dateStr, timeStr, eqScale(s), lon, lat));
                }
            });
            earthquakes = oldEq.concat(earthquakes);
            comboboxes[0].prop("disabled", false);
        });
    }); // parse earthquakes

    /* Parse Tsunami data */
    fileName = "data/tsunami.csv";
    d3.csv(fileName, async function (error, ts) {
        if (error != null) {
            //console.log(error);
            failedFiles.push(fileName);
            return;
        }
        tsunami = [];
        var max = d3.max(ts, function (d) { return d.TS_INTENSI; });
        var min = d3.min(ts, function (d) { return d.TS_INTENSI; });
        tScale = d3.scale.linear().domain([min, max]).range([3, 10]);
        ts.forEach(function (t) {
            var s = parseFloat(t.TS_INTENSI);
            var lon = parseFloat(t.LONGITUDE);
            var lat = parseFloat(t.LATITUDE);
            if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {

                var timeStr = "" + t.ARR_HOUR + ":" + t.ARR_MIN;
                var dateStr = moment(t.DATE_STRIN, "YYYY MM DD").format(dateStringFormat);
                tsunami.push(new Phenomenon("Tsunami", "blue", dateStr, timeStr, tScale(s), lon, lat));
            }
        });
        comboboxes[1].prop("disabled", false);
    }); // parse tsunami.

    /* Parsetrophical storms  data */
    fileName = "data/atlantic_pacific_storms.csv";
    d3.csv(fileName, async function (error, ts) {
        if (error != null) {
            //console.log(error);
            failedFiles.push(fileName);
            return;
        }
        cyclone = [];
        var max = d3.max(ts, function (d) { return d["Maximum Wind"]; });
        var min = d3.min(ts, function (d) { return d["Maximum Wind"]; });
        cScale = d3.scale.linear().domain([min, max]).range([1, 5]);
        ts.forEach(function (t) {
            var s = parseFloat(t["Maximum Wind"]);
            var lon = parseFloat(t.Longitude.replace("W", ""));
            var lat = parseFloat(t.Latitude.replace("N", ""));
            if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {
                var timeStr;
                switch (t.Time.length) {
                    case 4:
                        timeStr = t.Time.substr(0, 2) + ":" + t.Time.substr(2, 4);
                        break;
                    case 3:
                        timeStr = t.Time.substr(0, 1) + ":" + t.Time.substr(1, 3);
                        break;
                    default:
                        timeStr = "00:00";
                        break;
                }
                var dateStr = moment(t.Date, "YYYYMMDD").format(dateStringFormat);
                cyclone.push(new Phenomenon("Cyclone", "grey", dateStr, timeStr, cScale(s), lon, lat));
            }
        });
        fileName = "data/american_winds.csv";
        d3.csv(fileName, async function (error, ts2) {      // add american storms
            if (error != null) {
                //console.log(error);
                failedFiles.push(fileName);
                return;
            }
            var max = d3.max(ts2, function (d) { return d["max_wind_kt"]; });
            var min = d3.min(ts2, function (d) { return d["max_wind_kt"]; });
            cScale = d3.scale.linear().domain([min, max]).range([1, 5]);
            ts2.forEach(function (t) {              // add all coordinates 
                var regex = /[+-]?\d+(\.\d+)?/g;
                var str = t.track;
                var coordinates = str.match(regex).map(function (v) { return parseFloat(v); });
                for (var i = 0; i < coordinates.length; i += 2) {
                    var s = parseFloat(t["max_wind_kt"]);
                    var lat = parseFloat(coordinates[i]);
                    var lon = parseFloat(coordinates[i + 1]);
                    if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {
                        var timeStr = "";
                        var dateStr = moment(t.year, "YYYY").format(dateStringFormat);
                        cyclone.push(new Phenomenon("Cyclone", "grey", dateStr, timeStr, cScale(s), lon, lat));
                    }
                }
            });
            comboboxes[2].prop("disabled", false);
        });     // cyclone data
    });     // cyclone data

    /* Parse volcanic erruptions data*/
    fileName = "data/volcan.csv";
    d3.csv(fileName, async function (error, volcans) {
        if (error != null) {
            //console.log(error);
            failedFiles.push(fileName);
            return;
        }
        volcan = [];
        var max = d3.max(volcans, function (d) { return d.TOTAL_DEATHS; });
        var min = d3.min(volcans, function (d) { return d.TOTAL_DEATHS; });
        vScale = d3.scale.pow().exponent(0.2).domain([min, max]).range([3, 5]);
        volcans.forEach(function (v) {
            var s = parseFloat(v.TOTAL_DEATHS);
            if (s == undefined || isNaN(s))     // a lot of data is undefined so we take 3 as minimum
                s = min;
            var lon = parseFloat(v.Longitude);
            var lat = parseFloat(v.Latitude);
            if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {
                var timeStr = volcans.time;
                var dateStr = "" + v.Day + "/" + v.Month + "/" + v.Year;
                volcan.push(new Phenomenon("Volcanic Eruption", "red", dateStr, timeStr, vScale(s), lon, lat));
            }
        });
        comboboxes[3].prop("disabled", false);
    }); // parse volcanic eruptions.

    setTimeout(function () {
        if (failedFiles.length != 0) {
            var errMsg = errMsg1;
            failedFiles.forEach(function (file) {
                errMsg += file + ", ";
            });
            errMsg += errMsg2;
            alert(errMsg);
        }
    }, 2000);
}); // document ready

/* filtered phenomena by year and check box. */
var filtered;
async function parseAll() {
    svg.selectAll(".dot").remove();

    filtered = [];
    naturalDisasters = [];
    /* Filter checked phenomena */
    if (comboboxes[0].is(':checked')) {
        naturalDisasters = naturalDisasters.concat(earthquakes);
    }
    if (comboboxes[1].is(':checked')) {
        naturalDisasters = naturalDisasters.concat(tsunami);
    }
    if (comboboxes[2].is(':checked')) {
        naturalDisasters = naturalDisasters.concat(cyclone);
    }
    if (comboboxes[3].is(':checked')) {
        naturalDisasters = naturalDisasters.concat(volcan);
    }
    /* Get filtered natural disasters by currentYear */
    filtered = naturalDisasters.filter(function (e) {
        if (e != undefined) {
            return moment(e.Date, dateStringFormat).get('year').toString() == currentYear;
        }
    });

    /* Draw circles */
    svg.selectAll("circle")
        .data(filtered)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", function (d) { return projection([d.Longitude, d.Latitude])[0]; })
        .attr("cy", function (d) { return projection([d.Longitude, d.Latitude])[1]; })
        .style("fill", function (d) { return d.Color; })
        .on("mouseover", function (d) {
            d3.select(this).style("fill", d3.rgb(d.Color).darker(2));
            var text = "<type><font color=\"" + d.Color + "\">" + d.Type + "</font></type>";
            if (d.Date != undefined) text += "<br/>Date: " + d.Date;
            if (d.Time != undefined && d.Time != "") text += "<br/>Time: " + d.Time;
            text += "<br/>Severity: " + d.Severity.toFixed(2);
            enableToolTip(text, d.Color);
        })
        .on("mouseout", function (d) {
            d3.select(this).style("fill", d.Color);
            disableToolTip();
        })
        .transition()
        .attr("transform", getTranslationString(zoom.scale(), zoom.translate())) // align pos to map
        .each("start", function () {
            d3.select(this)
                .attr("r", 0)
        })
        .each("end", function () {
            d3.select(this)
                .transition()
                .duration(500)
                .attr("r", function (d) { return d.Severity / zoom.scale(); })
        });

}   // parse all

/* Build time slider */
function buildTimeSlider() {
    $('#time-slider').empty();
    $('#time-slider').append("<div id=\"current-year\">Viewing Year: " + minYear + "</div>");
    d3.select('#time-slider').call(d3.slider()
        .axis(true).min(minYear).max(maxYear).step(1)
        .on("slide", function (evt, value) {
            currentYear = value;
            enableToolTip(currentYear);
        })
        .on("slideend", function () {
            disableToolTip();
            parseAll();
            $("#current-year").text("Viewing Year: " + currentYear);
        })
    );
}


/*********************************** Map ZooM and drag handling *******************************/

/**
 * Limit dragging map and circles out of bounds.
 * Represented as translation string
 */
function getTranslationString(scale, translation) {
    var h = height * scale;
    var w = width * scale;
    var padding = 0;
    var tbound = -(h - height) - padding;
    var lbound = -(w - width) - padding;
    translation = [
        Math.max(Math.min(translation[0], padding), lbound),
        Math.max(Math.min(translation[1], padding), tbound)
    ];
    return "translate(" + translation + ") scale(" + scale + ")";
}

/* Apply zoom settings considering the last window resize */
var zoom;
function applyZoomSettings() {
    /* The main zoom and drag event handler */
    zoom = d3.behavior.zoom()
        .scaleExtent([1, 8])
        .on("zoom", function () {
            g.attr("transform", getTranslationString(d3.event.scale, d3.event.translate));
            g.selectAll("path").attr("d", path.projection(projection));
            svg.selectAll(".dot")
                .attr("transform", getTranslationString(d3.event.scale, d3.event.translate))
                .transition()
                .attr("r", function (d) { return d.Severity / d3.event.scale; });
            d3.select("#map-zoomer").node().value = zoom.scale();
        });
    svg.call(zoom);

    /* zoom in button clicked */
    d3.select('#zoom-in').on('click', function () {
        var extent = zoom.scaleExtent();
        if (zoom.scale() === extent[1]) {
            return false;
        }
        zoomerFunction(1.2, extent);
    });

    /* zoom out button clicked */
    d3.select('#zoom-out').on('click', function () {
        var extent = zoom.scaleExtent();
        if (zoom.scale() === extent[0]) {
            return false;
        }
        zoomerFunction(1 / 1.2, extent);
    });

    /* zoom logics for zoom in/out buttons */
    function zoomerFunction(factor, extent) {
        var scale = zoom.scale(), translate = zoom.translate();
        var x = translate[0], y = translate[1];
        var target_scale = scale * factor;

        var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
        if (clamped_target_scale != target_scale) {
            target_scale = clamped_target_scale;
            factor = target_scale / scale;
        }
        x = (x - center[0]) * factor + center[0];
        y = (y - center[1]) * factor + center[1];
        zoom.scale(target_scale).translate([x, y]);
        g.transition().attr("transform", getTranslationString(zoom.scale(), zoom.translate()));
        g.selectAll("path").attr("d", path.projection(projection));
        svg.selectAll(".dot")
            .transition()
            .attr("transform", getTranslationString(zoom.scale(), zoom.translate()))
            .attr("r", function (d) { return d.Severity / zoom.scale(); });
        d3.select("#map-zoomer").node().value = zoom.scale();
    }

    /* reset zoom clicked */
    d3.select('#reset').on('click', function () {
        zoom.translate([0, 0]);
        zoom.scale(1);
        g.transition().attr("transform", getTranslationString(zoom.scale(), zoom.translate()));
        g.selectAll("path").attr("d", path.projection(projection))
        svg.selectAll(".dot")
            .transition()
            .attr("transform", getTranslationString(zoom.scale(), zoom.translate()))
            .transition()
            .attr("r", function (d) { return d.Severity / zoom.scale(); });
        d3.select("#map-zoomer").node().value = zoom.scale();
    });

    /* zoom slider logics */
    d3.select('#map-zoomer').on("change", function () {
        var scale = zoom.scale(), extent = zoom.scaleExtent(), translate = zoom.translate();
        var x = translate[0], y = translate[1];
        var target_scale = +this.value;
        var factor = target_scale / scale;
        var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
        if (clamped_target_scale != target_scale) {
            target_scale = clamped_target_scale;
            factor = target_scale / scale;
        }
        x = (x - center[0]) * factor + center[0];
        y = (y - center[1]) * factor + center[1];
        zoom.scale(target_scale).translate([x, y]);
        g.transition().attr("transform", getTranslationString(zoom.scale(), zoom.translate()));
        g.selectAll("path").attr("d", path.projection(projection));
        svg.selectAll(".dot")
            .transition()
            .attr("transform", getTranslationString(zoom.scale(), zoom.translate()))
            .attr("r", function (d) { return d.Severity / zoom.scale(); });
    });

};  // apply zoom settings

