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
