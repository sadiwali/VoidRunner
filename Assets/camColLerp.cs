using UnityEngine;
using System.Collections;

public class camColLerp : MonoBehaviour {


    int a = 0;
    private Light l;
    private Color[] cols = new Color[5];
    void Start()
    {
        l = GetComponent<Light>();
        cols[0] = Color.red;
        cols[1] = Color.white;
        cols[2] = Color.cyan;
        cols[3] = Color.magenta;
        cols[4] = Color.yellow;
        


    }
	// Update is called once per frame
	void Update () 
    {
       
  
        l.color = Color.Lerp(l.color,cols[a],Time.deltaTime);
        if(l.color == cols[a])
        {
            a++;
            if (a >= 4)
                a = 0;
        }
	
	}
}
