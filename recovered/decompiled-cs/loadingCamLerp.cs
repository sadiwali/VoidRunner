using UnityEngine;

public class loadingCamLerp : MonoBehaviour
{
	private void Start()
	{
	}

	private void Update()
	{
		GetComponent<Camera>().backgroundColor = Color.Lerp(GetComponent<Camera>().backgroundColor, Color.white, Time.deltaTime);
	}
}
