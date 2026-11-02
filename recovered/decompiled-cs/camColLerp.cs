using UnityEngine;

public class camColLerp : MonoBehaviour
{
	private int a;

	private Light l;

	private Color[] cols = new Color[5];

	private void Start()
	{
		l = GetComponent<Light>();
		ref Color reference = ref cols[0];
		reference = Color.red;
		ref Color reference2 = ref cols[1];
		reference2 = Color.white;
		ref Color reference3 = ref cols[2];
		reference3 = Color.cyan;
		ref Color reference4 = ref cols[3];
		reference4 = Color.magenta;
		ref Color reference5 = ref cols[4];
		reference5 = Color.yellow;
	}

	private void Update()
	{
		l.color = Color.Lerp(l.color, cols[a], Time.deltaTime);
		if (l.color == cols[a])
		{
			a++;
			if (a >= 4)
			{
				a = 0;
			}
		}
	}
}
