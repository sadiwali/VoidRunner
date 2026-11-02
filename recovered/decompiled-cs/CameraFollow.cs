using UnityEngine;

public class CameraFollow : MonoBehaviour
{
	private Transform player;

	private Rigidbody2D plr;

	public float cameraSpeed;

	public float cameraNorm;

	public float cameraMax;

	public float internalCameraNorm;

	private void Start()
	{
		player = GameObject.FindWithTag("plr").GetComponent<Transform>();
		plr = player.GetComponent<Rigidbody2D>();
		internalCameraNorm = cameraNorm;
	}

	private void Update()
	{
		float z = Mathf.Clamp(0f - plr.velocity.magnitude, cameraMax, cameraNorm);
		base.transform.position = Vector3.Lerp(base.transform.position, new Vector3(player.position.x, player.position.y, z), cameraSpeed * Time.deltaTime);
	}
}
