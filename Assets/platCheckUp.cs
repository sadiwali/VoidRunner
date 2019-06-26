using UnityEngine;
using System.Collections;

public class platCheckUp : MonoBehaviour {

    public bool up;

	void Start () {
	
	}
	
    void OnTriggerEnter2D(Collider2D col)
    {

        if(col.CompareTag("ground"))
        {

            if (up)
                GetComponentInParent<molerat>().platUp = true;
            if (!up)
                GetComponentInParent<molerat>().platDown = true;
        }
    }

    void OnTriggerExit2D(Collider2D col)
    {
        if (col.CompareTag("ground"))
        {

            if (up)
                GetComponentInParent<molerat>().platUp = false;
            if (!up)
                GetComponentInParent<molerat>().platDown = false;
        }

    }
    
}
