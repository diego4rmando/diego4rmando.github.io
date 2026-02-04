// Author: Diego Armando Plascencia Vega


//--------loop function-----------

function loop_backg_colors(){

var lightShift=205;
var valRange=255-lightShift;
var d = new Date();	//create Date object
var s=d.getSeconds();	//get seconds
var CS=Math.round(s*(valRange*6)/60);

var gColor1=CStoRGB(CS,lightShift);		//top gradient background color
var gColor2=CStoRGB(CS+(valRange*2),lightShift);	//bottom gradient background color
var mColor=[0,0,255];		//page content font color

document.getElementById("back").style.background="linear-gradient(rgb("+gColor1[0]+","+gColor1[1]+","+gColor1[2]+"),rgb("+gColor2[0]+","+gColor2[1]+","+ gColor2[2]+"))";

setTimeout('loop_backg_colors()',1000);

}



//----functions------

function CStoRGB(CS,lightShift){


//var lightShift=220;
var valRange=255-lightShift;

var maxVal=255;
var minVal=lightShift;	//should be the same number as "light shift"

if(CS>(valRange*6)){

CS=CS%(valRange*6);

}


if(CS>0 && CS<=valRange){

var CStrans=CS
var R=maxVal;
var G=minVal;
var B=minVal+CS;	//B is increasing

}
else if(CS>valRange && CS<=(valRange*2)){

var CStrans=CS-valRange;
var R=maxVal-CStrans;	//R is decreasing
var G=minVal;
var B=maxVal;

}
else if(CS>(valRange*2) && CS<=(valRange*3)){

var CStrans=CS-(valRange*2);
var R=minVal;
var G=minVal+CStrans;	//G increases
var B=maxVal;

}
else if(CS>(valRange*3) && CS<=(valRange*4)){

var CStrans=CS-(valRange*3);
var R=minVal;
var G=maxVal;
var B=maxVal-CStrans;	//B decreases

}
else if(CS>(valRange*4) && CS<=(valRange*5)){

var CStrans=CS-(valRange*4);
var R=minVal+CStrans;	//R increases
var G=maxVal;
var B=minVal;

}
else if(CS>(valRange*5) && CS<=(valRange*6)){

var CStrans=CS-(valRange*5);
var R=maxVal;
var G=maxVal-CStrans;
var B=minVal;

}
else{	// should only be when CS == 0

var CStrans=0;
var R=maxVal;
var G=minVal;
var B=minVal;

}

return [R,G,B];

}