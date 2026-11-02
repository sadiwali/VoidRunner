using UnityEngine;

public class CheckLoaded : MonoBehaviour
{
	private wNT nWT;

	private void Awake()
	{
		nWT = GameObject.FindWithTag("netMan").GetComponent<wNT>();
		nWT.callRPC_loadedMap();
	}
}
