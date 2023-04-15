//スタンドアロン版
import {TBSKmodemJS} from "tbskmodem-js"


TBSKmodemJS.load().then((tbsk)=>{
    console.log(tbsk.version);}
)