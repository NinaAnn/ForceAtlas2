# ForceAtlas2
Realization of ForceAtlas2 Layout using javascripts<br>

discription of ForceAtlas2 layout: [ForceAtlas2](https://ninaann.github.io/2018/07/06/ForceAtlas2/),
functions that **unrealised**: adapting local speed and adating global speed.
Instead, when approach convergence, a parameter called *energy* is added to evaluate the total energy of the layout, 
when *energy* is smaller than a threadshold, the whole layout stops changing.

Node.js here is a test data copied from another project.
execution example: <br>

```js
FL = new forceLayout();
FL.updateNodes(data);
FL.updateLayout();
while(FL.energy > 0.05){
    FL.updateLayout();
}
FL.printPosition();
```
