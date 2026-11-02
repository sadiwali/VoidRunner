using System.Collections;
using UnityEngine;
using UnityEngine.UI;

public class Sayer : MonoBehaviour
{
	private Vector3 startPos;

	private Vector3 endPos;

	public float animateSpeed;

	private bool animating;

	private bool bringDown = true;

	private Text sayerText;

	private RectTransform me;

	private void Start()
	{
		me = GetComponent<RectTransform>();
		startPos = me.localPosition;
		sayerText = GetComponentInChildren<Text>();
		endPos = new Vector3(me.localPosition.x, me.localPosition.y - 100f, me.localPosition.z);
	}

	public void Say(string s, int time)
	{
		animating = true;
		bringDown = true;
		sayerText.text = s;
		GetComponent<AudioSource>().Play();
		StartCoroutine("count", time);
	}

	private void Update()
	{
		if (!animating)
		{
			return;
		}
		if (bringDown)
		{
			me.localPosition = Vector3.Lerp(me.localPosition, endPos, Time.deltaTime * animateSpeed);
			return;
		}
		me.localPosition = Vector3.Lerp(me.localPosition, startPos, Time.deltaTime * animateSpeed / 2f);
		if (me.localPosition == startPos)
		{
			animating = false;
			bringDown = true;
		}
	}

	private IEnumerator count(int t)
	{
		yield return new WaitForSeconds(t);
		bringDown = false;
	}
}
