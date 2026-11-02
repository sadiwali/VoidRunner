using UnityEngine;

public class NetworkPlayerPositionTransfer : MonoBehaviour
{
	public GameObject obj;

	private Transform myPlayer;

	private GameObject[] wisps;

	private Vector3 plrRefPos;

	private wNT nWT;

	private void Start()
	{
		myPlayer = GameObject.FindWithTag("plr").GetComponent<Transform>();
		nWT = GameObject.FindWithTag("netMan").GetComponent<wNT>();
	}

	public void StartGhostSpawn()
	{
		if (Network.isClient)
		{
			wisps = new GameObject[wNT.internalplrC];
			MonoBehaviour.print("ip" + wNT.internalplrC);
			for (int i = 0; i < wNT.internalplrC; i++)
			{
				wisps[i] = Object.Instantiate(obj, new Vector3(myPlayer.position.x, myPlayer.position.y + 1000f, myPlayer.position.z), myPlayer.rotation) as GameObject;
			}
		}
	}

	private void FixedUpdate()
	{
		if (Network.isClient)
		{
			if (myPlayer.position != plrRefPos)
			{
				nWT.callRPC_TransferPositionValues(myPlayer.transform.position, Network.player.ipAddress);
			}
			plrRefPos = myPlayer.position;
		}
	}

	public void UpdatePos(Vector3 pos, int indexx)
	{
		if (Network.isClient)
		{
			try
			{
				wisps[indexx].transform.position = pos;
			}
			catch (UnityException ex)
			{
				MonoBehaviour.print(ex.Message);
			}
		}
	}
}
