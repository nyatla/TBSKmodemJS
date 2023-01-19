//スタンドアロン版
import {TBSKmodemJS} from "tbskmodem-js"


TBSKmodemJS.load().then((tbsk)=>{
    console.log(TBSKmodemJS.version);
    console.log(tbsk.version);}
)