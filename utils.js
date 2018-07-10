
//Global Variances:
/**
 * 1. Can be changed by users:
 *  k_g: parameter of gravity, default 1
 *  k_r: parameter of repulsion,default 0.5
 *  ips_w: parameter of edge weight, default 0.5
 *  tick: get new position value from this function every x minute 
 *  viscous: parameter of resistance
 *  olradius: when the distance of two nodes < olradius, think them as overlapped
 *  maxVelocity: set maximum to velocity
 * 
 *  width: width of the total layout
 *  height: height of the total layout
 * 
 *  linlog: boolen, switch to linlog mode or not, default false
 *  DissuadeHubs: boolen, switch to dissuade hubs mode or not, default false
 * 
 * 2. can't get changed by users:
 *  Nodes: array of all object node
 *  nodeNumber: total number of nodes
 */


var k_g = 1;
var k_r = 1;
var ips_w = 0.5;
var tick = 0.1;
var olradius = 2;
var viscous = 0.9;
var maxVelocity = 5;

var width = 100;
var height = 100;

var linlog = false;
var DissuadeHubs = false;

var Nodes = [];
var nodeNumber = 0;

// useful functions:
function setParameters(paraName, paraVal){
/**    
 * set value of global variances
 * input:  
 *   parameter name: paraName, string
 *   parameter value: paraVal
 */
    let _script = paraName + "=" + paraVal;
    eval(_script);
}

function setModes(modeName, modeVal){
/**    
 * set state of different modes
 * input:  
 *   mode name: modeName, string
 *   mode value: modeVal, boolen
 */
    let _script = modeName + "=" + modeVal;
    eval(_script);
}

function createNode(id,x,y,neighbors) {
/**
 * Create class node,containing:
 * id: identific node id
 * coordinate: x, y
 * connected neighbors: neighbors
 *      type: array
 *      content: neighbor id
 * degree: deg
 * weight: m, default = 1.0
 * gravity: grav
 * velocity: v
 * accelerate: acc
 * move direction: dir
 */
    var oTempNode = new Object;
    oTempNode.id = id;
    oTempNode.x = x;
    oTempNode.y = y;
    oTempNode.neighbors = neighbors;
    oTempNode.deg = neighbors.length;
    oTempNode.m = 1.0;
    oTempNode.grav = getGravity(neighbors.length);
    oTempNode.v = [0, 0];
    oTempNode.acc = 0;
    oTempNode.dir = [0, 0];
    oTempNode.updateAcc = function(){
        let forceA = calNodeForce(this);
        this.acc = forceA/this.m;
    }
    oTempNode.updateVel = function(){
        this.v[0] = (this.v[0] + this.acc * this.dir[0] * tick) * viscous;
        this.v[1] = (this.v[1] + this.acc * this.dir[1] * tick) * viscous;
        if(this.v[0] > maxVelocity){
            this.v[0] = maxVelocity;
        }
        
        if(this.v[1] > maxVelocity){
            this.v[1] = maxVelocity;
        }
    }
    oTempNode.updatePosition = function(){
        this.x = this.x + this.v[0] * tick;
        this.y = this.y + this.v[1] * tick;
    }
    return oTempNode;
}


//functions to treat vectors
function calVecNorm(vec){
    return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
}

// functions to calculate next position
function getGravity(deg){
    return k_g * (deg + 1);
}

function distance(A, B){
    return Math.sqrt((A.x - B.x) * (A.x - B.x) + (A.y - B.y) * (A.y - B.y));
}

function direction(A, B){
/** 
 * Direction of force given from B to A
 * return: an normalized vector: [x, y]
 */
    let dx = B.x - A.x;
    let dy = B.y - A.y;
    let dis = distance(A, B);
    if(dis != 0){
        return [dx/dis, dy/dis];
    }
    else{
        return [0, 0];
    }
}

function dir2Center(A){
    let cx = width/2;
    let cy = height/2;
    let dx = cx - A.x;
    let dy = cy - A.y;
    let dis = calVecNorm([dx, dy]);
    if(dis != 0){
        return [dx/dis, dy/dis];
    }
    else{
        return [0, 0];
    }

}

function attraction(A, B, w){
/**
 * Calculate the attraction that node B gives to node A, there exists three modes:
 * normal
 * linlog
 * dissuade hubs: in this mode the attraction of A->B is different from B->A.
 */
    let dis = distance(A, B) - olradius;
    if(linlog == true){
        return Math.pow(w,ips_w) * Math.log(1 + dis);
    }
    else if(DissuadeHubs == true){
        return ids/(A.deg + 1);
    }
    else{
        return Math.pow(w,ips_w) * dis;
    }

} 

function repulsion(A, B, olmode){
    let kr;
    if(olmode == false){
        kr = k_r;
    }
    else{
        kr = k_r * 2;
    }
    return kr * (A.deg + 1) * (B.deg + 1) / distance(A, B);
}

function setEdgeGravity(A, B){
    if(A.neighbors.indexOf(B.id) == -1){
        return 0;
    }
    else{
        w = 0
        for(_i=0;_i<A.neighbors.length;_i++){
            if(A.neighbors[_i] == B.id){
                w++;
            }
        }
        return w;
    }
}

function calEdgeForce(A, B){
/**
 * Calculate the force between two nodes
 * return: value
 */
    w = setEdgeGravity(A, B);
    let dis = distance(A, B);
    if(dis > olradius){
        return attraction(A, B, w) - repulsion(A, B, false) ;
    }
    else if(dis == olradius){
        return 0;
    }
    else{
        return  0 - repulsion(A, B, true) ;
    }
}

function calNodeForce(A){
/**
 * Calculate the total directied force of a  node
 *   two different methods given: Normal & Barnes
 * return: array [forcex, forcey]
 */
    let forceA = Normal(A);
    return forceA;
}

function Normal(A){
/** 
 * Calculate total force that node A suffers by using normal traversal of all other nodes
 */

    let forceA = [0, 0];
    for(i = 0;i < nodeNumber;i++){
        dirForceA = [0, 0];
        if(Nodes[i].id != A.id){
            let dirBA = direction(A, Nodes[i]);
            let forceBA = calEdgeForce(A, Nodes[i]);
            dirForceA[0] = forceBA * dirBA[0];
            dirForceA[1] = forceBA * dirBA[1];
            forceA[0] += dirForceA[0];
            forceA[1] += dirForceA[1];
        }
    }

    //add gravity
    let gravdir = dir2Center(A);
    forceA[0] += A.grav * gravdir[0];
    forceA[1] += A.grav * gravdir[1];

    // console.log(forceA);

    unDirFA = calVecNorm(forceA);
    if(unDirFA != 0){
        A.dir = [forceA[0]/unDirFA, forceA[1]/unDirFA];
    }
    else{
        A.dir = [0, 0];
    }
    return unDirFA;
}

function Barnes(A){
    //TODO
}

// actions done with the whole layout:

function updateLayout(Nodes){
    Nodes.forEach(element => {
        element.updateAcc();
        element.updateVel();
    });
    Nodes.forEach(element => {
        element.updatePosition();
        console.log(element.id, element.x, element.y);
    });
}

function addNode(id,neighbors){
    id = Nodes.length +1;
    let initSize = 30;
    let x = width * 0.5 + initSize * (Math.random() - .5);
    let y = height * 0.5 + initSize * (Math.random() - .5);
    nodeNumber += 1;
    Nodes.push(createNode(id,x,y,neighbors));
}

function calTotalEnergy(Nodes){
    energy = 0;
    Nodes.forEach(element => {
        energy += Math.pow(calVecNorm(element.v), 2) * 0.5 * element.m;
    })
    return energy;
}

//run:
addNode(1,[2,3,2,4,7]);
addNode(2,[1,1,4]);
addNode(3,[1,4,5,7]);
addNode(4,[1,2,3,5,5,5,5,7,8,1]);
addNode(5,[3,4,4,4,4,9]);
addNode(6,[]);
addNode(7,[1,3,4,8]);
addNode(8,[4,9,9,9,7]);
addNode(9,[5,8,8,8]);

updateLayout(Nodes);
var layoutEnergy = calTotalEnergy(Nodes);
console.log(layoutEnergy);
while(layoutEnergy>=0.001){
    updateLayout(Nodes);
    layoutEnergy = calTotalEnergy(Nodes);
    console.log(layoutEnergy);
}