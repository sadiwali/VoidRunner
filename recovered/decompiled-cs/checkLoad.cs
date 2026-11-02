using UnityEngine;

public class checkLoad : MonoBehaviour
{
	private wNT nWT;

	private void Awake()
	{
		if (Network.isClient && (bool)GameObject.Find("netMan"))
		{
			nWT = GameObject.FindWithTag("netMan").GetComponent<wNT>();
			nWT.callRPC_loadedMap();
			nWT.STRT();
		}
	}
}
