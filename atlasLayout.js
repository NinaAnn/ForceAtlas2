
let node = function(id,x,y,neighbors) {
    /**
     * Create class node,containing:
     * id identific node id
     * coordinate: x, y
     * connected neighbors: neighbors
     *      type: array
     *      content: neighbor id
     * degree: deg
     * weight: m, default = 1.0
     * velocity: v
     * accelerate: acc
     * move direction: dir
     */
        this.id = id;
        this.x = x;
        this.y = y;
        this.neighbors = neighbors;
        this.deg = neighbors.length;
        this.m = 1.0;
        this.v = [0, 0];
        this.acc = 0;
        this.dir = [0, 0];
};


class forceLayout {
	constructor(options) {
        this.options = {
            k_g : 1,
            k_r : 1,
            ips_w : 0.5,
            tick : 0.1,
            olradius : 2,
            viscous : 0.9,
            maxVelocity : 20,
            width : 100,
            height : 100,
            linlog : false,
            DissuadeHubs : false
        };
        this.Nodes = [];
        this.nodeNumber = 0;
        this.energy = 0;


    }

    calVecNorm(vec){
        return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
    }

    distance(A, B){
        return Math.sqrt((A.x - B.x) * (A.x - B.x) + (A.y - B.y) * (A.y - B.y));
    }

    direction(A, B){
        /** 
         * Direction of force given from B to A
         * return: an normalized vector: [x, y]
         */
            let dx = B.x - A.x;
            let dy = B.y - A.y;
            let dis = this.distance(A, B);
            if(dis != 0){
                return [dx/dis, dy/dis];
            }
            else{
                return [0, 0];
            }
        }
    dir2Center(A){

        let cx = this.options.width/2;
        let cy = this.options.height/2;
        let dx = cx - A.x;
        let dy = cy - A.y;
        let dis = this.calVecNorm([dx, dy]);
        if(dis != 0){
            return [dx/dis, dy/dis];
        }
        else{
            return [0, 0];
        }
    }

    attraction(A, B, w){
        /**
         * Calculate the attraction that node B gives to node A, there exists three modes:
         * normal
         * linlog
         * dissuade hubs: in this mode the attraction of A->B is different from B->A.
         */
            let dis = this.distance(A, B) - this.options.olradius;
            if(this.options.linlog == true){
                return Math.pow(w,this.options.ips_w) * Math.log(1 + dis);
            }
            else if(this.options.DissuadeHubs == true){
                return dis/(A.deg + 1);
            }
            else{
                return Math.pow(w,this.options.ips_w) * dis;
            }
        
        } 

    repulsion(A, B, olmode){
        let kr;
        if(olmode == false){
            kr = this.options.k_r;
        }
        else{
            kr = this.options.k_r * 2;
        }
        return kr * (A.deg + 1) * (B.deg + 1) / this.distance(A, B);
    }

    getGravity(node){
        return this.options.k_g * (node.deg + 1);
    }

    setEdgeGravity(A, B){
        if(A.neighbors.indexOf(B.id) == -1){
            return 0;
        }
        else{
            let w = 0;
            let i = 0;
            for(i=0;i<A.neighbors.length;i++){
                if(A.neighbors[i] == B.id){
                    w++;
                }
            }
            return w;
        }
    }

    calEdgeForce(A, B){
        /**
         * Calculate the force between two nodes
         * return: value
         */
            let w = this.setEdgeGravity(A, B);
            let dis = this.distance(A, B);
            if(dis > this.options.olradius){
                return this.attraction(A, B, w) - this.repulsion(A, B, false) ;
            }
            else if(dis == this.options.olradius){
                return 0;
            }
            else{
                return  0 - this.repulsion(A, B, true) ;
            }
    }

    calNodeForce(A){
    /**
     * Calculate the total directied force of a  node
     *   two different methods given: Normal & Barnes
     * return: array [forcex, forcey]
     */
        let forceA = this.Normal(A);
        return forceA;
    }

    Normal(A){
    /** 
     * Calculate total force that node A suffers by using normal traversal of all other nodes
     */
    
        let forceA = [0, 0];
        let i = 0;
        for(i = 0;i < this.nodeNumber;i++){
            let dirForceA = [0, 0];
            if(this.Nodes[i].id != A.id){
                let dirBA = this.direction(A, this.Nodes[i]);
                let forceBA = this.calEdgeForce(A, this.Nodes[i]);
                dirForceA[0] = forceBA * dirBA[0];
                dirForceA[1] = forceBA * dirBA[1];
                forceA[0] += dirForceA[0];
                forceA[1] += dirForceA[1];
            }
        }
        //add gravity
        let gravdir = this.dir2Center(A);
        let grav = this.getGravity(A);
        forceA[0] += grav * gravdir[0];
        forceA[1] += grav * gravdir[1];

        // console.log(forceA);
    
        let unDirFA = this.calVecNorm(forceA);
        if(unDirFA != 0){
            A.dir = [forceA[0]/unDirFA, forceA[1]/unDirFA];
        }
        else{
            A.dir = [0, 0];
        }
        return unDirFA;
    }

    updateLayout(){
        this.Nodes.forEach(element => {
            element.updateAcc();
            element.updateVel();
        });
        this.Nodes.forEach(element => {
            element.updatePosition();
            console.log(element.id, element.x, element.y);
        });
    }

    addNode(id,neighbors){
        id = this.Nodes.length +1;
        let initSize = 30;
        let x = this.options.width * 0.5 + initSize * (Math.random() - .5);
        let y = this.options.height * 0.5 + initSize * (Math.random() - .5);
        let newNode = new node(id,x,y,neighbors);
        this.nodeNumber += 1;
        this.Nodes.push(newNode);
    }

    calTotalEnergy(){
        this.energy = 0;
        this.Nodes.forEach(element => {
            this.energy += Math.pow(this.calVecNorm(element.v), 2) * 0.5 * element.m;
        })
    }

    updateAcc(element){
        let forceA = this.calNodeForce(element);
        element.acc = forceA/element.m;
    }

    updateVel(element){
        element.v[0] = (element.v[0] + element.acc * element.dir[0] * this.options.tick) * this.options.viscous;
        element.v[1] = (element.v[1] + element.acc * element.dir[1] * this.options.tick) * this.options.viscous;
        if(element.v[0] > this.options.maxVelocity){
            element.v[0] = this.options.maxVelocity;
        }
        if(element.v[1] > this.options.maxVelocity){
            element.v[1] = this.options.maxVelocity;
        }
    }

    updatePosition(element){
        element.x = element.x + element.v[0] * this.options.tick;
        element.y = element.y + element.v[1] * this.options.tick;
    }

    updateLayout(){
        this.Nodes.forEach(element => {
            this.updateAcc(element);
            this.updateVel(element);
        })

        this.Nodes.forEach(element => {
            this.updatePosition(element);
            console.log(element.id, element.x, element.y);
        })

    }
}

FL = new forceLayout();
FL.addNode(1,[2,3,2,4,7]);
FL.addNode(2,[1,1,4]);
FL.addNode(3,[1,4,5,7]);
FL.addNode(4,[1,2,3,5,5,5,5,7,8,1]);
FL.addNode(5,[3,4,4,4,4,9]);
FL.addNode(6,[]);
FL.addNode(7,[1,3,4,8]);
FL.addNode(8,[4,9,9,9,7]);
FL.addNode(9,[5,8,8,8]);
FL.calTotalEnergy();

FL.updateLayout();