using UnityEngine;

public class GroundCheck : MonoBehaviour
{
	private Player player;

	public GameObject wallCheck;

	private bool playable = true;

	private void Start()
	{
		player = base.gameObject.GetComponentInParent<Player>();
	}

	private void OnTriggerEnter2D(Collider2D col)
	{
		if (col.CompareTag("ground"))
		{
			player.grounded = true;
			player.drilling = false;
			if (playable)
			{
				player.GetComponent<AudioSource>().Play();
				playable = false;
			}
			player.wallSliding = false;
			wallCheck.SetActive(value: false);
		}
	}

	private void OnTriggerStay2D(Collider2D col)
	{
		if (col.CompareTag("ground"))
		{
			player.grounded = true;
			player.drilling = false;
			player.wallSliding = false;
		}
	}

	private void OnTriggerExit2D(Collider2D col)
	{
		if (col.CompareTag("ground"))
		{
			player.grounded = false;
			wallCheck.SetActive(value: true);
			playable = true;
		}
	}
}
