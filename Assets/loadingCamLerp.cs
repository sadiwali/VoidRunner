using UnityEngine;
using System.Collections;

public class loadingCamLerp : MonoBehaviour {

	// Use this for initialization
	void Start () {
	
	}
	
	// Update is called once per frame
	void Update () 
    {
        GetComponent<Camera>().backgroundColor = Color.Lerp(GetComponent<Camera>().backgroundColor, Color.white, Time.deltaTime);

	
	}
}
