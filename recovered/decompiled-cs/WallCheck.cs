using UnityEngine;

public class WallCheck : MonoBehaviour
{
	private Player player;

	public GameObject groundCheck;

	private void Start()
	{
		player = base.gameObject.GetComponentInParent<Player>();
	}

	private void OnTriggerEnter2D(Collider2D col)
	{
		if (col.CompareTag("ground"))
		{
			player.wallSliding = true;
			player.grounded = false;
		}
	}

	private void OnTriggerExit2D(Collider2D col)
	{
		if (col.CompareTag("ground"))
		{
			player.wallSliding = false;
			player.IncrementTimesWallJumped();
		}
	}
}
