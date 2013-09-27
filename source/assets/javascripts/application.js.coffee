#= require "jquery"
#= require "plugins/jquery.dotdotdot"

view_height = (elem, ratio)->
  if !$(elem).get(0)
    return
  else
    height = Math.ceil(window.innerHeight) / ratio
    $(elem).css({ "min-height": height })

scroll_resize = ->
  $(window).on 'scroll', ->
    scroll_top = $(document).scrollTop()
    offset = $('.projects').offset()

    if scroll_top > offset.top
      $('.home #nav').addClass('scrolled')

    else
      $('.home #nav').removeClass('scrolled')
    
    if scroll_top > 0
      $('.home #nav').addClass('small')
      
    else
      $('.home #nav.small').removeClass('small')

$ ->
  if $("#problems-list").length > 0
    $("#problems-list .problem-summary").each ->
      $(this).dotdotdot()
