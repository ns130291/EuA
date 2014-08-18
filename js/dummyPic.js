function supports_canvas() {
    return !!document.createElement('canvas').getContext;
}

function initC(){
    if(supports_canvas()){
        var canvas = document.getElementsByClassName('dummyPic');
        var ctx,width,height;
        //alert(canvas.length);
        for(var i = 0; i< canvas.length;i++){
            //alert(i);
            width = canvas[i].width;
            height = canvas[i].height;
            ctx = canvas[i].getContext('2d');
            ctx.strokeRect(0, 0, width, height);
            ctx.moveTo(0, 0);
            ctx.lineTo(width, height);
            ctx.moveTo(width, 0);
            ctx.lineTo(0, height);
            ctx.stroke();
        }
    }
}

document.addEventListener('DOMContentLoaded', initC, false);