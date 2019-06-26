using UnityEngine;
using System.Collections;

public class edgeChecker : MonoBehaviour 
{


    void OnTriggerExit2D(Collider2D col)
    {
        if (col.CompareTag("ground"))
        {
            GetComponentInParent<molerat>().saveEdge = true;

        }

    }
    void OnTriggerEnter2D(Collider2D col)
    {
        if (col.CompareTag("ground"))
        {
            GetComponentInParent<molerat>().saveEdge = false;

        }
    }



}
