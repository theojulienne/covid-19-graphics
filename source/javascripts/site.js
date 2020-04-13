(function($) {
  // Resize all graphs that need it
  var resizeGraphs = function() {
    $('.plotly-graph-needs-resize').each(function() {
      let id = this.id;
      requestAnimationFrame(function() {
        Plotly.relayout(id, {});        
      });
    });
  };

  // Toggle the side navigation
  var toggleSidebar = function(e) {
    $("body").toggleClass("sidebar-toggled");
    $(".sidebar").toggleClass("toggled");
    if ($(".sidebar").hasClass("toggled")) {
      $('.sidebar .collapse').collapse('hide');
    };
    resizeGraphs();
  };

  $(document).ready(function() {
    $("#sidebarToggleTop").on('click', toggleSidebar);

    if ($(document).width() < 768) {
      toggleSidebar();
    }

    $(window).resize(resizeGraphs);
  });
})(jQuery);


// log graphs with doubling lines
function plotly_log_graph_with_doubling_lines(id, traces, ymin, ymax, line_for_current_trajectory) {
  var max_xval = 0;
  for (var i in traces) {
    max_xval = Math.max(traces[i].y.length - traces[i].x.indexOf(0) - 1, max_xval);
  }

  var graph_boty = Math.pow(10, ymin);
  var graph_topy = Math.pow(10, ymax);
  var graph_rangey = graph_topy - graph_boty;

  var annotations = [];
  var shapes = [];
  var days = [1,2,3,5,7,14];
  for (var i in days) {
    var d = days[i];
    var top_hit_x = Math.log2(graph_topy / graph_boty) * d;
    // assume the line hits the top of the graph, so we need our next relative to that point
    var x = top_hit_x;
    var y = graph_topy;
    var xanchor = 'middle';
    var yanchor = 'top';
    if (top_hit_x > max_xval) {
      // the line doesn't intersect the top of the graph (not exponential enough for the scale),
      // so it intersects the right side of the graph instead
      x = max_xval;
      y = Math.pow(10, ymin) * Math.pow(2, max_xval / d);
      xanchor = 'right';
      yanchor = 'top';
    }
    annotations.push({
      text: (d == 1 ? "doubling every day" : "doubling every " + d + " days"),
      textangle: 0,
      x: x,
      y: Math.log10(y),
      xref: 'x',
      yref: 'y',
      showarrow: false,
      xanchor: xanchor,
      yanchor: yanchor,
      font: {
        color: '#aaaaaa',
        size: 10
      },
      bgcolor: '#ffffff'
    });
    shapes.push({
      x0: 0,
      x1: max_xval,
      type: 'line',
      y0: Math.pow(10, ymin),
      y1: Math.pow(10, ymin) * Math.pow(2, max_xval / d),
      xref: 'x',
      yref: 'y',
      line: {
        color: '#aaaaaa',
        dash: 'dot',
        width: 1
      }
    });
  }

  if (line_for_current_trajectory != null) {
    var start_curr = line_for_current_trajectory.x.indexOf(0);
    var start_to_end = line_for_current_trajectory.x.length - start_curr;
    var days_for_trajectory = 14;
    if (start_to_end >= days_for_trajectory) {
      // we have N days of data
      var oldest_day_index = line_for_current_trajectory.x.length - days_for_trajectory;
      var oldest_day = line_for_current_trajectory.x[oldest_day_index];
      var latest_day = line_for_current_trajectory.x[line_for_current_trajectory.x.length - 1];
      var last_n = line_for_current_trajectory.y.slice(oldest_day_index);
      var oldest = last_n[0];
      var latest = last_n[last_n.length - 1];
      var oldest_log = Math.log2(oldest);
      var latest_log = Math.log2(latest);
      var delta_log_y = latest_log - oldest_log;

      // work out where we would have been at day 0 given the current trajectory line
      var traj_start = latest * Math.pow(2, -latest_day * (delta_log_y / days_for_trajectory));
      
      // in 'days_for_trajectory' days (x) we've changed by 'delta_log_y' (y)
      var final_y = traj_start * Math.pow(2, max_xval * (delta_log_y / days_for_trajectory));
      shapes.push({
        x0: 0,
        x1: max_xval,
        type: 'line',
        y0: traj_start,
        y1: final_y,
        xref: 'x',
        yref: 'y',
        opacity: 0.5,
        line: {
          color: '#ff0000',
          dash: 'dot',
          width: 1
        }
      });

      if (Math.log10(final_y) < ymax) {
        // hits the right side, so the doubling rate matters more
        var days = parseInt(1 / (delta_log_y / days_for_trajectory));
        annotations.push({
          text: "currently doubling every " + days + " days (avg last 2 weeks)",
          textangle: 0,
          x: latest_day,
          y: Math.log10(latest),
          xref: 'x',
          yref: 'y',
          showarrow: false,
          xanchor: 'left',
          yanchor: 'top',
          opacity: 0.5,
          font: {
            color: '#ff0000',
            size: 10
          },
          bgcolor: '#ffffff'
        });
      }
    }
  }

  var p = Plotly.newPlot(
    id,
    traces,
    $.extend({}, default_layout, {yaxis: {type: "log", range: [ymin,ymax]}, xaxis: {rangemode: "nonnegative", autorange: true}, annotations: annotations, shapes: shapes}),
    $.extend({}, default_config)
  );
}

// now take the 'confirmed' graph and shift the x values.
function shift_graph_to_threshold(raw_traces, day0_threshold) {
  day0_threshold = day0_threshold || 100;
  var adjusted_traces = [];
  for (var i in raw_traces) {
    var trace = raw_traces[i];
    var adjusted_trace = $.extend(true, {}, trace);
    var day0_index;
    for (var j in adjusted_trace.y) {
      if (adjusted_trace.y[j] >= day0_threshold) {
        day0_index = j;
        break;
      }
    }
    for (var j in adjusted_trace.x) {
      adjusted_trace.x[j] = j - day0_index;
    }
    adjusted_traces.push(adjusted_trace);
  }
  return adjusted_traces;
}

// makes all lines have lower opacity
function lower_opacity(traces, opacity) {
  for (var i in traces) {
    traces[i].opacity = opacity;
  }
  return traces;
}

function limit_to_biggest_series(traces, limit, visibility) {
  var ordered = traces.sort(function(a, b) {
    return b.y[b.y.length - 1] - a.y[a.y.length - 1];
  });

  for (var i in ordered) {
    if (i >= limit) {
      ordered[i]['visible'] = (visibility == null ? 'legendonly' : visibility);
    }
  }

  return ordered;
}

function combine_trace_data(trace_a, trace_b) {
  if (trace_a == null) return trace_b;
  if (trace_b == null) return trace_a;

  if (trace_a.x.indexOf(trace_b.x[0]) == -1) {
    // b starts before a, so swap
    var tmp = trace_a;
    trace_a = trace_b;
    trace_b = tmp;
  }

  // now we know that they overlap, and that 'a' starts before 'b'
  var start_of_b = trace_a.x.indexOf(trace_b.x[0]);

  for (var i = 0; i < trace_b.x.length; i++) {
    trace_a.x[start_of_b + i] = trace_b.x[i];
    if (start_of_b + i < trace_a.y.length) {
      trace_a.y[start_of_b + i] += trace_b.y[i];
    } else {
      trace_a.y[start_of_b + i] = trace_b.y[i];
    }
  }

  return trace_a;
}

// shows just the top N, and if there are more, groups the rest
function limit_to_biggest_series_group_rest(traces, limit) {
  if (traces.length <= limit) {
    return traces;
  }

  var ordered = traces.sort(function(a, b) {
    return b.y[b.y.length - 1] - a.y[a.y.length - 1];
  });

  var new_trace = null;
  for (var i in ordered) {
    if (i >= limit) {
      new_trace = combine_trace_data(new_trace, ordered[i]);
    }
  }

  new_trace.name = 'All others';

  var new_traces = ordered.slice(0, limit);
  new_traces.push(new_trace);

  return new_traces;
}

//
function plotly_log_graph_vs_top(id, skip_country_iso, main_line, top10_dataset, field) {
  // we want the confirmed and deaths for the country, plus the top 10 countries
  var lines_log = [];
  for (var country_iso in top10_dataset['subseries']) {
    if (country_iso == skip_country_iso) continue;
    lines_log.push(country_series_scaled(top10_dataset, top10_dataset['subseries'][country_iso], country_iso, scale_none, '')[field]);
  }

  lines_log = lower_opacity(limit_to_biggest_series(lines_log, 9, false), 0.3);
  
  lines_log.push($.extend({}, main_line, {line: {color: '#ff0000'}}));

  var threshold = 100;
  var ymin = 2;
  if (field == 'deaths') {
    threshold = 10;
    ymin = 1;
  }

  if (main_line.y[main_line.y.length - 1] > threshold) {
    plotly_log_graph_with_doubling_lines(id, shift_graph_to_threshold(lines_log, threshold), ymin, 7, shift_graph_to_threshold([main_line], threshold)[0]);
  } else {
    $('#'+id+'_row').remove();
  }
}