(function($) {
  // Resize all graphs that need it
  var resizeGraphs = function() {
    $('.plotly-graph-needs-resize').each(function() {
      Plotly.relayout(this.id, {});
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
