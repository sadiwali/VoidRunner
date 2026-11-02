using UnityEngine;

public class NextLevelCollider : MonoBehaviour
{
	private wNT nWT;

	private Player plr;

	private void Start()
	{
		if ((bool)GameObject.FindWithTag("netMan"))
		{
			nWT = GameObject.FindWithTag("netMan").GetComponent<wNT>();
		}
		plr = GameObject.FindWithTag("plr").GetComponent<Player>();
		MonoBehaviour.print("All is gooood");
	}

	private void OnTriggerEnter2D(Collider2D col)
	{
		if (col.gameObject.tag == "plr")
		{
			if (Network.isClient)
			{
				plr.SaveScores(t: true);
				nWT.finished = true;
			}
			else
			{
				nWT.StartCoroutine("loadGameSP");
			}
		}
	}
}
