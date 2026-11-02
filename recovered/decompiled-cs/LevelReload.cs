using UnityEngine;

public class LevelReload : MonoBehaviour
{
	private Player plrSC;

	private void Start()
	{
		plrSC = GameObject.FindWithTag("plr").GetComponent<Player>();
	}

	private void OnTriggerEnter2D(Collider2D Colider)
	{
		if (Colider.gameObject.tag == "plr")
		{
			plrSC.Die();
		}
	}
}
