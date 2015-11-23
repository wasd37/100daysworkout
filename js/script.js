//$("#divpage").load('top.html');

$(document).ready(
    function () {
        /* set day name to title*/
        var dayName = $('#fldDayName').val();
        if (dayName !== 'undefined') {
            $('title').text(dayName);
        }
    }
);